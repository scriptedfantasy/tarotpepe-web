// help-read — THE READING, ON THE CARD.
//
// The user: "for keep this reading, rather than going direct to pdf download, can we show the
// reading in the ? card and have a download button there?"
//
// So «KEEP THIS READING» no longer throws a file at the visitor from behind the notice. The notice
// turns over and becomes the reading: the very sheet the PDF holds — page one with the cards and
// the date, then the transcript — laid on the card's own paper, as many pages as it runs to, and
// two things to do about it at the foot of the last one: «DOWNLOAD», which is the tap that used to
// happen the moment they asked, and «BACK», which puts the notice up again exactly as it was.
//
// THE SAME PIXELS. The pages here are not a second drawing of the reading. They are the page
// canvases help-keep.js already rastered for the PDF (3x, 216 dpi at A5), scaled down to the card's
// measure at the display's own dpr, so what the visitor downloads is what they were just reading.
// The downscale is taken in halves rather than in one jump — a 1260 px plate landing on 345 css px
// is a better than 3:1 reduction, and one bilinear step through that throws away the thin end of
// the sign hand. Halving until the last step is under 2:1 keeps the letters.
//
// THE CARD IS THE NOTICE'S CARD. Same paper, same double border, same nib, same boil: the sheet is
// struck twice, once for each parity of the 12 fps two, by help-bill's own sheetEdge/doubleBorder,
// and the two plates are stacked and shown turn about. The pages themselves do NOT boil — a boil is
// a held drawing re-struck twelve times a second, and a page in somebody's hand is struck once
// (help-keep.js says so) — so they are laid on the boiling paper as the still things they are, each
// with a cut edge and the band of hatch below it that says one sheet is lying on another.
//
// SCROLLING HAPPENS INSIDE THE CARD, never on the page behind it: one roll of paper with
// `overflow-y: auto`, `touch-action: pan-y` and `overscroll-behavior: contain`, so a thumb on a
// phone moves the reading and nothing else. Nothing is set in a font here either; the two controls
// are lettered in the sign hand, in the boxes the notice rules its own controls with.
//
// THE MEASURE, on a 390 px phone: the card is 372 px, the roll 345, and an A5 page scaled to that
// puts the transcript's 11 pt cap at 9.0 px — the world's floor for lettering is 13 px for a
// caption you are asked to read across a room, and this is a page held at reading distance, which
// is why the phone gets the whole page rather than a crop of it.
import { PAPER } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signWidth } from './titles-sign.js';
import { BLEED, rule, sheetEdge, doubleBorder } from './help-bill.js';
import { PAGE } from './help-keep.js';

// What may be done about the reading. «DOWNLOAD» is the tap «KEEP THIS READING» used to be.
export const CONTROLS = [
  { key: 'download', label: 'DOWNLOAD' },
  { key: 'back', label: 'BACK' },
];
const SEED = { download: 124, back: 125 };

// ---------------------------------------------------------------------------------------------
// THE CUT
// ---------------------------------------------------------------------------------------------
/**
 * Set the reading's card for a frame of w x h CSS px. Everything is in CSS px: the card's box on
 * screen, the roll inside its border, and the control boxes in the roll's own coordinates.
 */
export function cutRead(w, h) {
  const pen = Math.max(1.4, h / 560); // the door's pen, the notice's pen
  // WIDER THAN THE NOTICE, and for one reason: the notice is a handbill that may be set to any
  // measure, and this is an A5 page that may not. The page's own transcript is 11 pt on a 420 pt
  // sheet, so the roll must be 345 px across before that lands at 9 px on a phone — which on a
  // 390 px frame leaves nine of margin. On a laptop it stops at the notice's own 620.
  const cardW = Math.round(Math.min(w * 0.955, 620));
  const cardH = Math.round(Math.min(h * 0.92, 1120));
  const in1 = Math.max(6, cardW * 0.018);
  const in2 = in1 + Math.max(3.5, pen * 2.4);
  const pad = Math.max(3, cardW * 0.009); // the paper between the inner rule and the page
  const inset = in2 + pad;
  const colW = Math.round(cardW - 2 * inset);

  // the two things to do about it, in the boxes the notice rules its own controls with
  const capCtrl = Math.max(13, Math.min(19, colW * 0.032));
  const ctrlPadX = capCtrl * 1.15, ctrlH = Math.max(44, capCtrl * 2.6), ctrlGap = capCtrl * 0.9;
  const ctrlW = CONTROLS.map((c) => signWidth(c.label, { capH: capCtrl, tracking: 0.2 }) + 2 * ctrlPadX);
  const side = ctrlW[0] + ctrlGap + ctrlW[1] <= colW;
  const boxes = [];
  if (side) {
    let x = (colW - (ctrlW[0] + ctrlGap + ctrlW[1])) / 2;
    CONTROLS.forEach((c, i) => {
      boxes.push({ key: c.key, label: c.label, x, y: 0, w: ctrlW[i], h: ctrlH });
      x += ctrlW[i] + ctrlGap;
    });
  } else {
    // a sheet that cannot take them side by side stacks them and gives each the whole measure,
    // which is what the notice does with its own three
    CONTROLS.forEach((c, i) => boxes.push({ key: c.key, label: c.label, x: 0, y: i * (ctrlH + ctrlGap * 0.7), w: colW, h: ctrlH }));
  }
  const ctrlBlockH = side ? ctrlH : boxes.length * ctrlH + (boxes.length - 1) * ctrlGap * 0.7;

  // THE CONTROLS BELONG TO THE CARD, NOT TO THE PAPER. They are struck at the foot of the card and
  // they stay there: the reading is three A5 pages long and a control at the end of it is a control
  // the visitor never finds. Only the paper inside the window moves. A rule runs across above them,
  // as the notice rules between its own blocks, so it is plain where the reading stops.
  const foot = Math.max(10, capCtrl * 0.75);
  const ctrlTop = cardH - inset - foot - ctrlBlockH;
  const ruleY = ctrlTop - Math.max(10, capCtrl * 0.75);

  return {
    card: { x: Math.round((w - cardW) / 2), y: Math.round((h - cardH) / 2), w: cardW, h: cardH },
    pen, in1, in2, pad, inset, colW, ctrlTop, ruleY,
    // a band of paper between the window's bottom edge and the rule, so the line the edge cuts in
    // half reads as paper running on underneath and not as lettering sitting on a rule
    rollH: Math.max(80, ruleY - inset - Math.max(10, capCtrl * 0.85)),
    // the paper left between one page and the next, and above and below the whole column
    gap: Math.round(colW * 0.055),
    band: Math.max(3, colW * 0.02), // the hatch under a page's bottom edge
    capCtrl, boxes, ctrlBlockH,
  };
}

// One strike of the card: the paper, its cut edge, the band that says it is lying on the room, and
// the double border. `parity` re-rolls the nib and nothing else — the same sheet, struck again.
function strikeCard(L, dpr, parity) {
  const c = document.createElement('canvas');
  c.width = Math.round((L.card.w + 2 * BLEED) * dpr);
  c.height = Math.round((L.card.h + 2 * BLEED) * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(BLEED, BLEED);
  const nib = mulberry32(parity ? 0x51ed7 : 0x9a3b1); // the notice's own two nibs
  const put = mulberry32(0x2f10c);
  sheetEdge(g, L.card.w, L.card.h, L.pen, nib, put);
  doubleBorder(g, L.card.w, L.card.h, L.pen, nib, L.in1, L.in2);
  // where the reading stops and the two things to do about it begin
  rule(g, L.inset, L.ruleY, L.card.w - L.inset, L.ruleY, L.pen * 0.62, nib, 3);
  return c;
}

// The controls, struck on their own transparent plate so they lie on whatever paper is behind them.
function strikeControls(L, dpr, parity) {
  const c = document.createElement('canvas');
  c.width = Math.round(L.colW * dpr);
  c.height = Math.round(L.ctrlBlockH * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const nib = mulberry32(parity ? 0x51ed7 : 0x9a3b1);
  const pen = L.pen;
  for (const b of L.boxes) {
    rule(g, b.x, b.y, b.x + b.w, b.y, pen * 1.1, nib, 4);
    rule(g, b.x + b.w, b.y, b.x + b.w, b.y + b.h, pen * 1.1, nib, 4);
    rule(g, b.x + b.w, b.y + b.h, b.x, b.y + b.h, pen * 1.1, nib, 4);
    rule(g, b.x, b.y + b.h, b.x, b.y, pen * 1.1, nib, 4);
    signCaps(g, b.label, b.x + b.w / 2, b.y + b.h / 2, {
      capH: L.capCtrl, tracking: 0.2, pen: Math.max(1.45, L.capCtrl * 0.14), seed: SEED[b.key] ?? 124, boil: parity,
    });
  }
  return c;
}

// A raster brought down to size in halves. One bilinear step through a better than 2:1 reduction
// loses the thin end of a hand-cut letter; halving until the last step is inside 2:1 does not.
function shrink(src, dw, dh) {
  let cur = src;
  while (cur.width >= dw * 2 && cur.height >= dh * 2) {
    const half = document.createElement('canvas');
    half.width = Math.max(1, Math.round(cur.width / 2));
    half.height = Math.max(1, Math.round(cur.height / 2));
    const hg = half.getContext('2d');
    hg.imageSmoothingEnabled = true;
    hg.imageSmoothingQuality = 'high';
    hg.drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
  }
  return cur;
}

// One page of the sheet, laid on the card: the PDF's own plate scaled to the measure, a cut edge
// round it, and the band of hatch below it — the notice's mark for one sheet lying on another.
function pagePlate(src, L, dpr, i) {
  const pageH = (L.colW * PAGE.h) / PAGE.w;
  const c = document.createElement('canvas');
  c.width = Math.round(L.colW * dpr);
  c.height = Math.round((pageH + L.band) * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const nib = mulberry32(0x3b21c + i * 977);
  const put = mulberry32(0x11a07 + i * 613);
  // the band first: it lies UNDER the page's own bottom edge and runs out of it. The strokes
  // gather in clumps along the run and most of them are short, as they do on the notice — a hand,
  // not a comb; a tone, not a fringe.
  const band = L.band;
  const thin = (u) => 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(u * 0.055 + 1.7 + i));
  for (let k = 0, n = Math.round(L.colW / 1.1); k < n; k++) {
    const x = put() * L.colW;
    if (put() < thin(x)) continue;
    const dy = band * (0.18 + 0.82 * put() ** 1.7);
    g.save();
    g.globalAlpha = 0.4 + put() * 0.35;
    g.strokeStyle = '#0d0e0d';
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, pageH + 0.3);
    g.lineTo(x + (put() - 0.5) * 1.1, pageH + 0.3 + dy);
    g.lineWidth = L.pen * 0.5;
    g.stroke();
    g.restore();
  }
  const fit = shrink(src, Math.round(L.colW * dpr), Math.round(pageH * dpr));
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.fillStyle = PAPER;
  g.fillRect(0, 0, L.colW, pageH);
  g.drawImage(fit, 0, 0, L.colW, pageH);
  // the page's own cut edge, a pen's breadth inside the plate so it is not shaved off by it
  const e = Math.max(0.5, L.pen * 0.4);
  rule(g, e, e, L.colW - e, e, L.pen * 0.72, nib, 2);
  rule(g, L.colW - e, e, L.colW - e, pageH - e, L.pen * 0.72, nib, 2);
  rule(g, L.colW - e, pageH - e, e, pageH - e, L.pen * 0.72, nib, 2);
  rule(g, e, pageH - e, e, e, L.pen * 0.72, nib, 2);
  return c;
}

// ---------------------------------------------------------------------------------------------
// THE THING ITSELF
// ---------------------------------------------------------------------------------------------
/**
 * The reading, as a piece of the notice's DOM. `onControl(key, phase)` is called for «DOWNLOAD» and
 * «BACK» — phase 'down' on the pointer coming down (which is where the sheet is warmed), and
 * 'click' inside the click itself, which is where the share sheet has to be asked for.
 *
 *   el          the root, to be mounted inside #help
 *   show(L)     lay the card out for this frame and put it up
 *   pages(cs)   the page canvases help-keep rastered for the PDF
 *   hide()      take it down
 *   step(p)     the 12 fps two: which plate is showing
 *   box(key)    a control's box on screen in px, or null if it is not in view
 *   roll        the element that scrolls
 */
export function makeReader({ onControl } = {}) {
  const style = document.createElement('style');
  style.textContent = `
    #help-read { position: absolute; display: none; }
    #help.reading #help-read { display: block; }
    #help-read > canvas.card { position: absolute; }
    #help-read .roll {
      position: absolute; overflow-y: auto; overflow-x: hidden;
      -webkit-overflow-scrolling: touch; touch-action: pan-y; overscroll-behavior: contain;
      scrollbar-width: none;
    }
    #help-read .roll::-webkit-scrollbar { width: 0; height: 0; display: none; }
    #help-read .col { position: relative; }
    #help-read .col > * { display: block; }
    #help-read .ctrl { position: absolute; }
    #help-read .ctrl > canvas { position: absolute; left: 0; top: 0; }
    #help-read .hit { position: absolute; cursor: pointer; }
  `;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'help-read';
  const roll = document.createElement('div');
  roll.className = 'roll';
  const col = document.createElement('div');
  col.className = 'col';
  roll.appendChild(col);
  el.appendChild(roll);

  let L = null, key = '', dpr = 1;
  let cardPlates = null, ctrlPlates = null, ctrlWrap = null;
  let src = null; // the page canvases as help-keep made them
  let parity = 0;

  function place(w, h, devicePR) {
    dpr = devicePR;
    const k = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
    if (k === key && L) return L;
    key = k;
    L = cutRead(w, h);
    Object.assign(el.style, { left: `${L.card.x}px`, top: `${L.card.y}px`, width: `${L.card.w}px`, height: `${L.card.h}px` });
    // the card, both strikes of it, stacked and shown turn about
    cardPlates?.forEach((c) => c.remove());
    cardPlates = [0, 1].map((p) => {
      const c = strikeCard(L, dpr, p);
      c.className = 'card';
      Object.assign(c.style, {
        left: `${-BLEED}px`, top: `${-BLEED}px`,
        width: `${L.card.w + 2 * BLEED}px`, height: `${L.card.h + 2 * BLEED}px`,
      });
      el.insertBefore(c, roll);
      return c;
    });
    Object.assign(roll.style, { left: `${L.inset}px`, top: `${L.inset}px`, width: `${L.colW}px`, height: `${L.rollH}px` });
    Object.assign(col.style, { width: `${L.colW}px`, paddingTop: `${L.gap}px`, paddingBottom: `${L.gap}px` });
    controls();
    lay();
    step(parity);
    return L;
  }

  // the two things to do about the reading, at the foot of the card and staying there
  function controls() {
    ctrlWrap?.remove();
    ctrlWrap = document.createElement('div');
    ctrlWrap.className = 'ctrl';
    Object.assign(ctrlWrap.style, {
      left: `${L.inset}px`, top: `${L.ctrlTop}px`, width: `${L.colW}px`, height: `${L.ctrlBlockH}px`,
    });
    ctrlPlates = [0, 1].map((p) => {
      const c = strikeControls(L, dpr, p);
      Object.assign(c.style, { width: `${L.colW}px`, height: `${L.ctrlBlockH}px` });
      ctrlWrap.appendChild(c);
      return c;
    });
    for (const b of L.boxes) {
      const hit = document.createElement('div');
      hit.className = 'hit';
      hit.dataset.key = b.key;
      Object.assign(hit.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
      hit.addEventListener('pointerdown', () => onControl?.(b.key, 'down'));
      hit.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onControl?.(b.key, 'click');
      });
      ctrlWrap.appendChild(hit);
    }
    el.appendChild(ctrlWrap);
  }

  // the paper in the window: every page of the sheet, one under the next
  function lay() {
    if (!L) return;
    col.textContent = '';
    for (const [i, page] of (src ?? []).entries()) {
      const c = pagePlate(page, L, dpr, i);
      const pageH = (L.colW * PAGE.h) / PAGE.w;
      Object.assign(c.style, { width: `${L.colW}px`, height: `${pageH + L.band}px`, marginTop: i ? `${L.gap}px` : '0' });
      col.appendChild(c);
    }
  }

  function step(p) {
    parity = p ? 1 : 0;
    cardPlates?.forEach((c, i) => (c.style.visibility = i === parity ? 'visible' : 'hidden'));
    ctrlPlates?.forEach((c, i) => (c.style.visibility = i === parity ? 'visible' : 'hidden'));
  }

  return {
    el,
    roll,
    get layout() {
      return L;
    },
    place,
    pages(canvases) {
      src = canvases ?? [];
      lay();
    },
    top() {
      roll.scrollTop = 0;
    },
    step,
    // a control's box on screen, in px — what a thumb has to hit, and how a tool finds it
    box(k) {
      const hit = ctrlWrap?.querySelector(`.hit[data-key="${k}"]`);
      if (!hit) return null;
      const r = hit.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    },
    // is the whole reading in view without scrolling?
    get scrollable() {
      return !!roll && roll.scrollHeight > roll.clientHeight + 1;
    },
  };
}
