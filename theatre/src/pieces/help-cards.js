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
// UNDER IT, its name in the sign hand, and under that its numeral if it is a trump and its suit if
// it is not — the two things printed on a Marseille card besides the picture.
//
// AT THE FOOT, three things: «‹», «BACK», «›». The two arrows are CUT, not lettered, because the
// sign hand is a case of caps, numerals and points and has no chevron in it (the at-sign on the
// notice's own signature is cut by hand for the same reason). They step through the whole deck in
// DECK order and wrap, so the visitor can walk the majors and the four suits end to end without
// going back to the table. The keyboard's arrows do the same, and so does a thumb dragged across
// the card.
//
// THE PLATE IS PRELOADED EITHER SIDE. Stepping must be instant — a card that fades in through a
// decode is a card the visitor waits for — so the neighbour in each direction is fetched the moment
// a card is shown, and the browser's cache hands it over on the step.
import { mulberry32 } from '../core/rng.js';
import { signCaps, signCapsFit, signWidth, signFold } from './titles-sign.js';
import { BLEED, rule, sheetEdge, doubleBorder } from './help-bill.js';
import { DECK, bySlug } from '../core/deck.js';

// the supplied plates, as they are on disk (public/cards/<slug>.webp)
export const PLATE = { w: 1024, h: 1792 };
const cardUrl = (slug) => `/cards/${slug}.webp`;

// What may be done about a card: 'prev', 'back', 'next'. BACK is the only one lettered — the two
// arrows are cut (chevron, below), because the sign hand has no chevron in it.
const BACK = 'BACK';

// ---------------------------------------------------------------------------------------------
// THE CUT
// ---------------------------------------------------------------------------------------------
// The sheet is solved AROUND THE PLATE rather than the plate fitted into a sheet. A card is 4:7 and
// a window is not, so the free number is the plate's height: everything else on the paper — the
// name, the rule, the three controls, the margins — is a fixed overhead, and what is left of the
// frame's height goes to the picture. Then the sheet is narrowed to the plate, so a laptop gets a
// portrait card standing in the middle of a landscape frame and not a letterbox with a stamp in it.
function shape(cardW, w, h, pen) {
  const in1 = Math.max(6, cardW * 0.018);
  const in2 = in1 + Math.max(3.5, pen * 2.4);
  // the paper between the inner rule and the plate. Wider than the reading's, because this sheet
  // holds ONE picture and a picture wants a mount: the plate is bound by the frame's height, not by
  // the sheet's width, so the margin costs it a couple of pixels and buys it a card on paper rather
  // than a card in a box.
  const pad = Math.max(5, cardW * 0.02);
  const inset = in2 + pad;
  const colW = Math.max(60, cardW - 2 * inset);

  const capCtrl = Math.max(13, Math.min(19, colW * 0.032));
  const capName = Math.max(15, Math.min(27, colW * 0.062));
  const capSub = Math.max(12, capName * 0.6);
  const nameH = capName * 1.5 + capSub * 1.75;

  // the three controls. 44 px is the floor for anything a thumb has to hit, whatever is in it.
  const ctrlH = Math.max(44, capCtrl * 2.6);
  const ctrlGap = capCtrl * 0.9;
  const arrowW = Math.max(52, capCtrl * 3.6);
  const backW = Math.max(44, signWidth(BACK, { capH: capCtrl, tracking: 0.2 }) + capCtrl * 2.3);
  const boxes = [];
  let ctrlBlockH = ctrlH;
  if (arrowW * 2 + backW + 2 * ctrlGap <= colW) {
    // the arrows at the two ends of the measure, BACK in the middle: ‹ ... BACK ... ›
    boxes.push({ key: 'prev', x: 0, y: 0, w: arrowW, h: ctrlH });
    boxes.push({ key: 'back', label: BACK, x: (colW - backW) / 2, y: 0, w: backW, h: ctrlH });
    boxes.push({ key: 'next', x: colW - arrowW, y: 0, w: arrowW, h: ctrlH });
  } else {
    // a sheet too narrow for the three keeps the pair that belong together on one row and gives
    // BACK the whole measure under them — the notice's own answer to the same problem
    const half = (colW - ctrlGap) / 2;
    const rowGap = ctrlGap * 0.7;
    boxes.push({ key: 'prev', x: 0, y: 0, w: half, h: ctrlH });
    boxes.push({ key: 'next', x: colW - half, y: 0, w: half, h: ctrlH });
    boxes.push({ key: 'back', label: BACK, x: 0, y: ctrlH + rowGap, w: colW, h: ctrlH });
    ctrlBlockH = ctrlH * 2 + rowGap;
  }

  const gapPlate = Math.max(8, capName * 0.55); // paper between the plate and its name
  const ruleGap = Math.max(10, capCtrl * 0.75);
  const foot = Math.max(10, capCtrl * 0.75);
  const overhead = 2 * inset + gapPlate + nameH + ruleGap * 2 + ctrlBlockH + foot;
  const availH = Math.min(h * 0.96, 1240) - overhead;
  let plateW = Math.round(Math.max(60, Math.min(colW, (Math.max(70, availH) * PLATE.w) / PLATE.h)));
  const plateH = Math.round((plateW * PLATE.h) / PLATE.w);

  const plateY = inset;
  const nameY = plateY + plateH + gapPlate; // the cap line of the name
  const subY = nameY + capName * 1.5;
  const ruleY = nameY + nameH + ruleGap;
  const ctrlTop = ruleY + ruleGap;
  const cardH = Math.round(ctrlTop + ctrlBlockH + foot + inset);

  return {
    card: { x: Math.round((w - cardW) / 2), y: Math.round((h - cardH) / 2), w: cardW, h: cardH },
    pen, in1, in2, pad, inset, colW,
    plate: { x: Math.round(inset + (colW - plateW) / 2), y: plateY, w: plateW, h: plateH },
    band: Math.max(3, plateW * 0.02), // the hatch under the plate's bottom edge
    capName, capSub, capCtrl, nameY, subY, ruleY, ctrlTop, ctrlBlockH, boxes, nameH,
  };
}

/** Set the card's face for a frame of w x h CSS px. Everything in CSS px. */
export function cutCards(w, h) {
  const pen = Math.max(1.4, h / 560);
  let cardW = Math.round(Math.min(w * 0.955, 620));
  let L = shape(cardW, w, h, pen);
  // …and then narrowed to the plate it turned out to hold, twice, which is enough to settle it
  for (let pass = 0; pass < 3 && L.plate.w < L.colW - 0.75; pass++) {
    const next = Math.max(180, Math.round(L.plate.w + 2 * L.inset));
    if (next >= cardW) break;
    cardW = next;
    L = shape(cardW, w, h, pen);
  }
  return L;
}

// ---------------------------------------------------------------------------------------------
// THE PEN
// ---------------------------------------------------------------------------------------------
// A chevron, cut by hand: two strokes meeting at a point, each running a little past the corner the
// way a nib does. `dir` −1 points it left, +1 right.
function chevron(g, cx, cy, capH, dir, pen, nib) {
  const wx = capH * 0.4, hy = capH * 0.52;
  const ax = cx + dir * wx * 0.5; // the point, on the side it points to
  rule(g, ax - dir * wx, cy - hy, ax, cy, pen, nib, 2.4);
  rule(g, ax, cy, ax - dir * wx, cy + hy, pen, nib, 2.4);
}

// One strike of the card: the paper, its cut edge, the double border, the bed the plate lies in,
// the rule above the controls and the three controls themselves. `parity` re-rolls the nib and
// nothing else — the same sheet, struck again. The plate is NOT here: it is an image lying on top.
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

  // where the card stops and the three things to do about it begin
  rule(g, L.inset, L.ruleY, L.card.w - L.inset, L.ruleY, pen * 0.62, nib, 3);
  for (const b of L.boxes) {
    const bx = L.inset + b.x, by = L.ctrlTop + b.y;
    rule(g, bx, by, bx + b.w, by, pen * 1.1, nib, 4);
    rule(g, bx + b.w, by, bx + b.w, by + b.h, pen * 1.1, nib, 4);
    rule(g, bx + b.w, by + b.h, bx, by + b.h, pen * 1.1, nib, 4);
    rule(g, bx, by + b.h, bx, by, pen * 1.1, nib, 4);
    const cx = bx + b.w / 2, cy = by + b.h / 2;
    if (b.key === 'back') {
      signCaps(g, b.label, cx, cy, {
        capH: L.capCtrl, tracking: 0.2, pen: Math.max(1.45, L.capCtrl * 0.14), seed: 126, boil: parity,
      });
    } else chevron(g, cx, cy, L.capCtrl * 1.35, b.key === 'prev' ? -1 : 1, Math.max(1.7, L.capCtrl * 0.16), nib);
  }
  return c;
}

// The card's name, on its own transparent plate so it can be re-struck when the card changes
// without the sheet being cut again: the name, and under it the numeral of a trump or the suit of
// a pip. Nothing here is set in a font, as nothing in this room is.
function strikeName(L, dpr, parity, card) {
  const c = document.createElement('canvas');
  c.width = Math.round(L.colW * dpr);
  c.height = Math.round(L.nameH * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!card) return c;
  const name = signFold(card.name);
  signCapsFit(g, name, L.colW / 2, L.capName * 0.5, L.colW, {
    capH: L.capName, tracking: 0.18, pen: Math.max(1.5, L.capName * 0.125), seed: 128, boil: parity,
  });
  const sub = signFold(card.arcana === 'major' ? card.numeral : card.suit);
  if (sub) {
    signCapsFit(g, sub, L.colW / 2, L.capName * 1.5 + L.capSub * 0.55, L.colW, {
      capH: L.capSub, tracking: 0.3, pen: Math.max(1.25, L.capSub * 0.115), seed: 129, boil: parity, alpha: 0.9,
    });
  }
  return c;
}

// ---------------------------------------------------------------------------------------------
// THE THING ITSELF
// ---------------------------------------------------------------------------------------------
/**
 * The card viewer, as a piece of the notice's DOM. `onControl(key)` is called for 'prev', 'back'
 * and 'next' — from the three controls and from a thumb dragged across the plate.
 *
 *   el          the root, to be mounted inside #help
 *   place(w,h,dpr)  lay the card out for this frame
 *   show(slug)  put a card on it; returns a promise for the plate having arrived
 *   step(p)     the 12 fps two: which strike is showing
 *   box(key)    a control's box on screen in px
 *   slug        which card is up
 *   layout      the cut
 */
export function makeCardView({ onControl } = {}) {
  const style = document.createElement('style');
  style.textContent = `
    #help-cards { position: absolute; display: none; touch-action: none; }
    #help.cards #help-cards { display: block; }
    #help-cards > canvas.sheet { position: absolute; }
    #help-cards img.plate { position: absolute; display: block; }
    #help-cards .name { position: absolute; }
    #help-cards .name > canvas { position: absolute; left: 0; top: 0; }
    #help-cards .hit { position: absolute; cursor: pointer; }
  `;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'help-cards';
  const img = document.createElement('img');
  img.className = 'plate';
  img.alt = '';
  img.decoding = 'async';
  el.appendChild(img);
  const nameWrap = document.createElement('div');
  nameWrap.className = 'name';
  el.appendChild(nameWrap);

  let L = null, key = '', dpr = 1;
  let sheets = null, names = null, hits = null;
  let slug = null, parity = 0;
  const warm = new Map(); // the neighbours, held so the browser keeps them

  function place(w, h, devicePR) {
    dpr = devicePR;
    const k = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
    if (k === key && L) return L;
    key = k;
    L = cutCards(w, h);
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
    Object.assign(nameWrap.style, { left: `${L.inset}px`, top: `${L.nameY}px`, width: `${L.colW}px`, height: `${L.nameH}px` });
    lay();
    controls();
    step(parity);
    return L;
  }

  // the name, struck for whichever card is up
  function lay() {
    if (!L) return;
    nameWrap.textContent = '';
    const card = slug ? bySlug[slug] : null;
    names = [0, 1].map((p) => {
      const c = strikeName(L, dpr, p, card);
      Object.assign(c.style, { width: `${L.colW}px`, height: `${L.nameH}px` });
      nameWrap.appendChild(c);
      return c;
    });
  }

  // the three things a visitor may do about the card. They are struck into the sheet; these are
  // only the boxes a thumb lands in.
  function controls() {
    hits?.forEach((d) => d.remove());
    hits = L.boxes.map((b) => {
      const hit = document.createElement('div');
      hit.className = 'hit';
      hit.dataset.key = b.key;
      Object.assign(hit.style, {
        left: `${L.inset + b.x}px`, top: `${L.ctrlTop + b.y}px`, width: `${b.w}px`, height: `${b.h}px`,
      });
      hit.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onControl?.(b.key);
      });
      el.appendChild(hit);
      return hit;
    });
  }

  // THE NEIGHBOURS, FETCHED. A step must be instant, and a plate is half a megabyte.
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
    if (L) lay();
    step(parity);
    const url = cardUrl(next);
    const done = new Promise((res) => {
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
    preload(i);
    return done;
  }

  function step(p) {
    parity = p ? 1 : 0;
    sheets?.forEach((c, i) => (c.style.visibility = i === parity ? 'visible' : 'hidden'));
    names?.forEach((c, i) => (c.style.visibility = i === parity ? 'visible' : 'hidden'));
  }

  // A THUMB DRAGGED ACROSS THE CARD steps it, which is the gesture a phone has instead of arrows —
  // and the arrows are there as well, because a phone is not the only thing with a thumb. The drag
  // has to be a real one: forty pixels, and more sideways than up, or a tap on the picture would
  // step the deck by accident.
  let drag = null;
  el.addEventListener('pointerdown', (ev) => {
    if (ev.target?.closest?.('.hit')) {
      drag = null;
      return;
    }
    drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
  });
  el.addEventListener('pointerup', (ev) => {
    const d = drag;
    drag = null;
    if (!d || ev.pointerId !== d.id) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    ev.stopPropagation();
    onControl?.(dx < 0 ? 'next' : 'prev'); // the card is dragged out of the way and the next one is under it
  });
  el.addEventListener('pointercancel', () => (drag = null));

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
    // a control's box on screen, in px — what a thumb has to hit, and how a tool finds it
    box(k) {
      const hit = hits?.find((d) => d.dataset.key === k);
      if (!hit) return null;
      const r = hit.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    },
    // the plate's box on screen, and whether the picture has actually arrived
    plateBox() {
      const r = img.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, loaded: !!img.naturalWidth, natural: [img.naturalWidth, img.naturalHeight] };
    },
  };
}
