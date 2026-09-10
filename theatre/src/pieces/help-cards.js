// help-cards — THE CARD, ON THE CARD. The third face of the notice.
//
// The user, seeing the whole deck laid face up on the cloth: "they are so beautiful, users should
// be able to look at them outside of the drawing." The lay-out (egg-deck.js) draws a card at about
// a third of its size, because seventy-eight of them do not fit on a 0.62 m table at any other
// size, and it pays for that with an insert. An insert is still INSIDE the drawing: it is lit by
// the room's key, it is bent on its own three sheets, the ink pass runs over it, and the whole of
// it is at most three quarters of the frame's short axis. What the user asked for is the plate
// itself, on paper, at the size the window allows and nothing between the eye and it.
//
// So it is the ? card's own paper, turned to a third face. Same sheet as the notice and as the
// reading (help-bill.js cuts all three), same double border, same nib, same boil at six strikes a
// second — and laid on it, ONE CARD, as printed: the supplied 1024x1792 face in an <img>, scaled by
// the browser and by nothing else. No ink pass. No boil on the plate. No hatching over it, no tone
// laid on top of it, no contour drawn round the picture. The card is a printed thing lying on a
// drawn thing, which is exactly what it is on the table.
//
// AND NOTHING ELSE IS ON THE PAPER. Rounds up to twelve lettered the card's name under the plate,
// its numeral or its suit under that, and cut «‹ BACK ›» at the foot — three controls that walked
// the whole deck in DECK order. The user, having used it:
//
//   "I can only always get the explainer for one card and switching the card before the explainer
//    happens kind of seems to break the chat window. […] I would suggest we remove the switching
//    capability when you click the card. And I think we can also remove the back and we can also
//    remove the explanation, because we have the explanation afterwards in the chat box, right?
//    The abort can be just clicking outside of the card."
//
// So all of it is gone: no name, no suit line, no arrows, no BACK, no keyboard step, no thumb
// dragged across the plate. What the sheet holds is the picture, and the picture is what the whole
// of the paper's height goes to — about twice the plate the lettered sheet could afford. The card
// is named where everything in this room is said, on the placard, in his own first line (flow.js).
// The way out is a finger anywhere off the paper, or Escape. `next`/`prev` are still on help.js's
// api, because a tool walks the deck with them; nothing a visitor can touch calls them, and
// `help:cards` — the lesson's cue — goes out when a card is PUT UP and at no other time, so a
// lesson is never cut off half-written.
//
// THE PLATE IS PRELOADED EITHER SIDE. The deck's own order is still the order a tool walks, and a
// card that fades in through a decode is a card the visitor waits for, so the neighbour in each
// direction is fetched the moment a card is shown.
//
// AND THE PAPER LEAVES THE PLACARD'S BAND FREE. The user, on the lay-out: "whenever a user clicks a
// card, pepe could explain the suit and the individual cards." So he teaches it, and he teaches it
// the only way anybody in this room says anything — on the caption card. Two pieces of paper cannot
// have the same band, so `place()` is given the height of the frame that is actually FREE — the
// window less whatever the placard has taken, at the foot where it stands all evening or at the
// HEAD, where a phone puts it while the deck is laid out (dialogue.js, THE DOCK) — and the sheet is
// solved and centred inside that rather than inside the window. The plate is the free number in the
// cut (see `shape`), so it is the plate that pays for the band.
import { mulberry32 } from '../core/rng.js';
import { BLEED, rule, sheetEdge, doubleBorder } from './help-bill.js';
import { DECK, bySlug } from '../core/deck.js';

// the supplied plates, as they are on disk (public/cards/<slug>.webp)
export const PLATE = { w: 1024, h: 1792 };
const cardUrl = (slug) => `/cards/${slug}.webp`;

// ---------------------------------------------------------------------------------------------
// THE CUT
// ---------------------------------------------------------------------------------------------
// The sheet is solved AROUND THE PLATE rather than the plate fitted into a sheet. A card is 4:7 and
// a window is not, so the free number is the plate's height: the paper's own margins are the only
// overhead left on the sheet, and everything else of the frame's height goes to the picture. Then
// the sheet is narrowed to the plate, so a laptop gets a portrait card standing in the middle of a
// landscape frame and not a letterbox with a stamp in it.
// `free` is the height of the frame the sheet may stand in — the window, less whatever the placard
// has taken at the foot or at the head. Everything below is solved against it and not against `h`.
function shape(cardW, w, h, pen, free) {
  const in1 = Math.max(6, cardW * 0.018);
  const in2 = in1 + Math.max(3.5, pen * 2.4);
  // the paper between the inner rule and the plate. Wider than the reading's, because this sheet
  // holds ONE picture and a picture wants a mount.
  const pad = Math.max(5, cardW * 0.02);
  const inset = in2 + pad;
  const colW = Math.max(60, cardW - 2 * inset);

  // the mount, top and bottom, and nothing else: no name, no rule, no controls
  const overhead = 2 * inset;
  const availH = Math.min(free * 0.96, 1240) - overhead;
  const plateW = Math.round(Math.max(60, Math.min(colW, (Math.max(70, availH) * PLATE.w) / PLATE.h)));
  const plateH = Math.round((plateW * PLATE.h) / PLATE.w);

  const plateY = inset;
  const cardH = Math.round(plateY + plateH + inset);

  return {
    // centred across the window, and centred DOWN THE FREE BAND: the paper stands in the picture
    // beside the placard, not in the middle of a frame the placard is standing in the edge of
    card: { x: Math.round((w - cardW) / 2), y: Math.round((free - cardH) / 2), w: cardW, h: cardH },
    free,
    pen, in1, in2, pad, inset, colW,
    plate: { x: Math.round(inset + (colW - plateW) / 2), y: plateY, w: plateW, h: plateH },
    band: Math.max(3, plateW * 0.02), // the hatch under the plate's bottom edge
  };
}

/**
 * Set the card's face for a frame of w x h CSS px. Everything in CSS px.
 * `free` is the height the sheet may stand in — the frame less the placard's band.
 */
export function cutCards(w, h, free = h) {
  const pen = Math.max(1.4, h / 560);
  const room = Math.max(180, Math.min(h, free));
  let cardW = Math.round(Math.min(w * 0.955, 800));
  let L = shape(cardW, w, h, pen, room);
  // …and then narrowed to the plate it turned out to hold, which is enough to settle it: with the
  // lettering gone the plate is bound by the frame's HEIGHT at every size, so the sheet simply
  // shrinks onto it and there is no second row of anything to break onto.
  for (let pass = 0; pass < 4 && L.plate.w < L.colW - 0.75; pass++) {
    const next = Math.max(180, Math.round(L.plate.w + 2 * L.inset));
    if (next >= cardW) break;
    cardW = next;
    L = shape(cardW, w, h, pen, room);
  }
  return L;
}

// ---------------------------------------------------------------------------------------------
// THE PEN
// ---------------------------------------------------------------------------------------------
// One strike of the card: the paper, its cut edge, the double border and the bed the plate lies in.
// `parity` re-rolls the nib and nothing else — the same sheet, struck again. The plate is NOT here:
// it is an image lying on top.
function strikeCard(L, dpr, parity) {
  const c = document.createElement('canvas');
  c.width = Math.round((L.card.w + 2 * BLEED) * dpr);
  c.height = Math.round((L.card.h + 2 * BLEED) * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(BLEED, BLEED);
  const nib = mulberry32(parity ? 0x51ed7 : 0x9a3b1); // the notice's own two nibs
  const put = mulberry32(0x2f10c);
  const pen = L.pen;
  sheetEdge(g, L.card.w, L.card.h, pen, nib, put);
  doubleBorder(g, L.card.w, L.card.h, pen, nib, L.in1, L.in2);

  // THE BED THE PLATE LIES IN. The band of hatch under its bottom edge is the notice's own mark for
  // one sheet lying on another (help-read.js lays it under every page of the reading), and the fine
  // rule round the picture is the card's cut edge. Both are struck a pen's breadth OUTSIDE the
  // plate's box, so the image lying on top does not cover them.
  const P = L.plate;
  const band = L.band;
  const thin = (u) => 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(u * 0.055 + 1.7));
  for (let k = 0, n = Math.round(P.w / 1.1); k < n; k++) {
    const x = P.x + put() * P.w;
    if (put() < thin(x)) continue;
    const dy = band * (0.18 + 0.82 * put() ** 1.7);
    g.save();
    g.globalAlpha = 0.4 + put() * 0.35;
    g.strokeStyle = '#0d0e0d';
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, P.y + P.h + 0.4);
    g.lineTo(x + (put() - 0.5) * 1.1, P.y + P.h + 0.4 + dy);
    g.lineWidth = pen * 0.5;
    g.stroke();
    g.restore();
  }
  const e = Math.max(0.6, pen * 0.5);
  const x0 = P.x - e, y0 = P.y - e, x1 = P.x + P.w + e, y1 = P.y + P.h + e;
  rule(g, x0, y0, x1, y0, pen * 0.72, nib, 2);
  rule(g, x1, y0, x1, y1, pen * 0.72, nib, 2);
  rule(g, x1, y1, x0, y1, pen * 0.72, nib, 2);
  rule(g, x0, y1, x0, y0, pen * 0.72, nib, 2);
  return c;
}

// ---------------------------------------------------------------------------------------------
// THE THING ITSELF
// ---------------------------------------------------------------------------------------------
/**
 * The card viewer, as a piece of the notice's DOM. It has no controls of its own: the sheet is the
 * picture and the way out is off the paper, which help.js answers for.
 *
 *   el          the root, to be mounted inside #help
 *   place(w,h,dpr,free)  lay the card out for this frame; `free` is the height beside the placard
 *   show(slug)  put a card on it; returns a promise for the plate being ON THE PAPER (decoded and
 *               painted), not merely fetched
 *   step(p)     the 12 fps two: which strike is showing
 *   slug        which card is up
 *   layout      the cut
 */
export function makeCardView() {
  const style = document.createElement('style');
  style.textContent = `
    #help-cards { position: absolute; display: none; }
    #help.cards #help-cards { display: block; }
    #help-cards > canvas.sheet { position: absolute; }
    #help-cards img.plate { position: absolute; display: block; }
  `;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'help-cards';
  const img = document.createElement('img');
  img.className = 'plate';
  img.alt = '';
  img.decoding = 'async';
  el.appendChild(img);

  let L = null, key = '', dpr = 1;
  let sheets = null;
  let slug = null, parity = 0;
  const warm = new Map(); // the neighbours, held so the browser keeps them

  function place(w, h, devicePR, free = h) {
    dpr = devicePR;
    const k = `${Math.round(w)}x${Math.round(h)}@${dpr}/${Math.round(free)}`;
    if (k === key && L) return L;
    key = k;
    L = cutCards(w, h, free);
    Object.assign(el.style, { left: `${L.card.x}px`, top: `${L.card.y}px`, width: `${L.card.w}px`, height: `${L.card.h}px` });
    // the sheet, both strikes of it, stacked and shown turn about
    sheets?.forEach((c) => c.remove());
    sheets = [0, 1].map((p) => {
      const c = strikeCard(L, dpr, p);
      c.className = 'sheet';
      Object.assign(c.style, {
        left: `${-BLEED}px`, top: `${-BLEED}px`,
        width: `${L.card.w + 2 * BLEED}px`, height: `${L.card.h + 2 * BLEED}px`,
      });
      el.insertBefore(c, img);
      return c;
    });
    Object.assign(img.style, { left: `${L.plate.x}px`, top: `${L.plate.y}px`, width: `${L.plate.w}px`, height: `${L.plate.h}px` });
    step(parity);
    return L;
  }

  // THE NEIGHBOURS, FETCHED. A card put up is half a megabyte, and the deck's order is the order
  // anything that walks it walks it in.
  function preload(i) {
    for (const d of [-1, 1]) {
      const s = DECK[(i + d + DECK.length) % DECK.length].slug;
      if (warm.has(s)) continue;
      const im = new Image();
      im.decoding = 'async';
      im.src = cardUrl(s);
      warm.set(s, im);
      if (warm.size > 12) warm.delete(warm.keys().next().value);
    }
  }

  function show(next) {
    const i = DECK.findIndex((c) => c.slug === next);
    if (i < 0) return Promise.resolve(false);
    slug = next;
    step(parity);
    const url = cardUrl(next);
    const arrived = new Promise((res) => {
      if (img.src.endsWith(url) && img.complete && img.naturalWidth) return res(true);
      const on = () => {
        img.removeEventListener('load', on);
        img.removeEventListener('error', on);
        res(true);
      };
      img.addEventListener('load', on);
      img.addEventListener('error', on);
      img.src = url;
    });
    // …AND THEN THE PICTURE IS ACTUALLY THERE. `load` means the bytes arrived, not that the plate is
    // on the paper: the plate is `decoding: async` and half a megabyte, so the browser fires load
    // and decodes afterwards — and a still taken in that gap is the sheet with a white hole in it,
    // which is exactly what happened to the first judged frame of this face
    // (public/progress/card-viewer/viewer-1280x800.png: the paper, the name, the controls, no
    // picture). decode() promises the image can be painted with no further delay, and the two
    // frames after it are the compositor doing the painting. Everything that waits on the plate —
    // the judging state, the tools — waits on THIS.
    const done = arrived
      .then(() => (img.decode ? img.decode().catch(() => {}) : null))
      .then(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))))
      .then(() => true);
    preload(i);
    return done;
  }

  function step(p) {
    parity = p ? 1 : 0;
    sheets?.forEach((c, i) => (c.style.visibility = i === parity ? 'visible' : 'hidden'));
  }

  return {
    el,
    place,
    show,
    step,
    get slug() {
      return slug;
    },
    get layout() {
      return L;
    },
    get card() {
      return slug ? bySlug[slug] : null;
    },
    // the sheet's own box on screen, in px — the paper a finger has to land OFF to put it down
    sheetBox() {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    },
    // the plate's box on screen, and whether the picture has actually arrived
    plateBox() {
      const r = img.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, loaded: !!img.naturalWidth, natural: [img.naturalWidth, img.naturalHeight] };
    },
  };
}
