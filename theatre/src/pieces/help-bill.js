// help-bill — the handbill. The pen work of the notice the shop keeps under its own sign.
//
// It is a printed card, not a dialog: one sheet of the same paper, cut square, ruled with a double
// border like the board it comes from, hand-lettered throughout in the sign hand (titles-sign.js).
// Nothing on it is set in a font, because nothing inside the drawing is.
//
// TWO WHITES. The sheet is the same paper as the room behind it, so a plain rectangle of it would
// be invisible. What separates them is what separates them in the film: a drawn edge, and a tight
// band of hatch laid just outside the bottom and right edges — the marks an animator makes to say
// one sheet is lying on another. There is no soft shadow anywhere near it.
//
// STRUCK, NOT SET. Everything is cut once, at build and at every resize, onto two plates — one for
// each parity of the 12 fps two — and the piece blits whichever plate the clock is on. So the whole
// notice boils, letters included, at six strikes a second, for the cost of one drawImage a frame.
// (This is the door's own answer: entrance-door.js bakes its name and warps the plate.)
//
// Measure: the sheet is at most 560 px and at most 88% of the frame's width, the body is lettered
// at a 13 px cap or better on every frame we ship, and every line is wrapped to the measure by
// signWidth, so a 390 px phone gets the same notice with more turns in it.
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signWidth } from './titles-sign.js';

// The notice, in the room's own voice. Short: a handbill, not a manual.
export const BILL = {
  head: 'NOTICE TO VISITORS',
  items: [
    ['I', 'TALK TO HIM. HE ANSWERS.'],
    ['II', 'THE CARDS COME OUT ONLY IF YOU ASK FOR THEM.'],
    ['III', 'THEN TAKE THREE: TAP ONE, OR SAY WHICH. «THE THIRD FROM THE LEFT».'],
    ['IV', 'THERE IS A MICROPHONE IF YOU WOULD RATHER SPEAK.'],
  ],
  foot: 'THE HOUSE IS NOT RESPONSIBLE FOR THE CARDS.',
  controls: [
    { key: 'close', label: 'VERY WELL' },
    { key: 'leave', label: 'I AM LEAVING' },
  ],
};

const BLEED = 26; // room on the plate for the border's overshoot and the drop-hatch
const TRACK = 0.16; // the body's tracking; the heading is wider

// Wrap one line to a measure, in the hand it will be lettered in.
function wrap(text, capH, maxW) {
  const words = text.split(' ');
  const out = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && signWidth(next, { capH, tracking: TRACK }) > maxW) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/**
 * Set the notice for a frame of w x h CSS px. Returns the sheet's box, the two control boxes (all
 * in CSS px, relative to the frame, with the sheet at rest) and the plates to blit.
 */
export function cutBill(w, h, dpr = 2) {
  // The notice is set at the largest hand that leaves it whole in the frame, and never at a cap
  // below the 13 px the world's rules put on lettering. A phone gets the same words with more
  // turns in them, not smaller words.
  let L = null;
  for (const k of [1, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58]) {
    L = layout(w, h, k);
    if (L.sheetH <= h * 0.9) break;
    if (L.capBody <= 13.01) break; // the floor: no smaller hand than this
  }
  return plate(w, h, dpr, L);
}

function layout(w, h, k) {
  const pen = Math.max(1.4, h / 560); // the door's pen: one nib, whatever the frame
  const sheetW = Math.round(Math.min(w * 0.88, 620) * (0.86 + 0.14 * k));
  const pad = Math.round(sheetW * 0.082);
  const capBody = Math.max(13, Math.min(19, sheetW * 0.032) * k);
  const capHead = capBody * 1.46;
  const capFoot = Math.max(13, capBody * 0.86);
  const capCtrl = Math.max(13, capBody * 0.98);
  const numW = Math.round(capBody * 2.15); // the column the numerals stand in
  const measure = sheetW - 2 * pad - numW;
  const lead = capBody * 1.92;

  // ---- set the text, and find the sheet's depth ----------------------------------------------
  const items = BILL.items.map(([n, t]) => ({ n, lines: wrap(t, capBody, measure) }));
  const foot = wrap(BILL.foot, capFoot, sheetW - 2 * pad);
  const bodyH = items.reduce((a, it) => a + it.lines.length * lead, 0) + (items.length - 1) * capBody * 0.62;

  // the controls: side by side if the measure takes them, stacked if it does not (and a stacked
  // pair is the better thumb target anyway)
  // 44 px is the floor for a control a thumb has to hit, whatever the lettering in it measures
  const ctrlPadX = capCtrl * 1.15, ctrlH = Math.max(44, capCtrl * 2.6), ctrlGap = capCtrl * 0.9;
  const ctrlW = BILL.controls.map((c) => signWidth(c.label, { capH: capCtrl, tracking: 0.2 }) + 2 * ctrlPadX);
  const side = ctrlW[0] + ctrlW[1] + ctrlGap <= sheetW - 2 * pad;
  const ctrlBlockH = side ? ctrlH : ctrlH * 2 + ctrlGap * 0.7;

  const yHead = pad + capHead * 0.5;
  const yRule1 = yHead + capHead * 0.5 + pad * 0.62;
  const yBody = yRule1 + pad * 0.72;
  const yRule2 = yBody + bodyH + pad * 0.5;
  const yFoot = yRule2 + pad * 0.5;
  const yCtrl = yFoot + foot.length * capFoot * 1.7 + pad * 0.72;
  const sheetH = Math.round(yCtrl + ctrlBlockH + pad);

  // ---- where the controls sit, in sheet coordinates -------------------------------------------
  const boxes = [];
  if (side) {
    let x = (sheetW - (ctrlW[0] + ctrlW[1] + ctrlGap)) / 2;
    BILL.controls.forEach((c, i) => {
      boxes.push({ key: c.key, label: c.label, x, y: yCtrl, w: ctrlW[i], h: ctrlH });
      x += ctrlW[i] + ctrlGap;
    });
  } else {
    const bw = sheetW - 2 * pad;
    BILL.controls.forEach((c, i) => {
      boxes.push({ key: c.key, label: c.label, x: pad, y: yCtrl + i * (ctrlH + ctrlGap * 0.7), w: bw, h: ctrlH });
    });
  }

  return { sheetW, sheetH, pen, pad, capBody, capHead, capFoot, capCtrl, numW, lead, items, foot, boxes, yHead, yRule1, yBody, yRule2, yFoot };
}

// Strike the laid-out notice twice — one plate for each parity of the two — and say where it sits.
function plate(w, h, dpr, L) {
  const plates = [0, 1].map((parity) => strike(L.sheetW, L.sheetH, dpr, { ...L, parity }));
  const x0 = Math.round((w - L.sheetW) / 2);
  const y0 = Math.round((h - L.sheetH) / 2);
  return {
    sheet: { x: x0, y: y0, w: L.sheetW, h: L.sheetH },
    controls: L.boxes.map((b) => ({ key: b.key, x: x0 + b.x, y: y0 + b.y, w: b.w, h: b.h })),
    plates,
    bleed: BLEED,
    capBody: L.capBody,
    capFoot: L.capFoot,
    capCtrl: L.capCtrl,
  };
}

// One strike of the notice, onto its own canvas. `parity` re-rolls the pen and nothing else: the
// sheet is the same sheet, struck again.
function strike(sheetW, sheetH, dpr, o) {
  const c = document.createElement('canvas');
  c.width = Math.round((sheetW + 2 * BLEED) * dpr);
  c.height = Math.round((sheetH + 2 * BLEED) * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(BLEED, BLEED);
  // the nib re-rolls with the parity; the marks that were PLACED (the drop-hatch) do not
  const nib = mulberry32(o.parity ? 0x51ed7 : 0x9a3b1);
  const put = mulberry32(0x2f10c);
  const pen = o.pen;

  // ---- the sheet, and the two edges that say it is lying on top --------------------------------
  // A tight band of strokes just outside the bottom and right edges. Not a shadow: the marks an
  // animator lays down where one sheet overlaps another, gone within a nail's breadth.
  const band = Math.max(8, pen * 7);
  const stroke = (x0, y0, dx, dy) =>
    inkLine(g, x0, y0, x0 + dx, y0 + dy, { width: pen * 0.55, wobble: 0.35, rng: put, alpha: 0.55 + put() * 0.35 });
  // Every stroke starts ON the edge and runs off it, a third to all of the band deep, and a
  // quarter of them are left out: a hand, not a comb. Detached from the edge it reads as a dotted
  // line lying on the floor, which is what the first cut of this did.
  // …and the strokes gather in clumps along the run, most of them short, a few running the whole
  // depth of the band, so it is a tone and not a fringe.
  const thin = (u) => 0.18 + 0.42 * (0.5 + 0.5 * Math.sin(u * 0.055 + 1.7));
  const deep = () => band * (0.18 + 0.82 * put() ** 1.7);
  for (let i = 0, n = Math.round(sheetW / (pen * 1.05)); i < n; i++) {
    const x = put() * (sheetW + band * 0.6);
    if (put() < thin(x)) continue;
    stroke(x, sheetH + 0.4, (put() - 0.5) * 1.3, deep());
  }
  // and down the right-hand edge, the same hand turned through a right angle
  for (let i = 0, n = Math.round(sheetH / (pen * 1.05)); i < n; i++) {
    const y = put() * (sheetH + band * 0.6);
    if (put() < thin(y)) continue;
    stroke(sheetW + 0.4, y, deep(), (put() - 0.5) * 1.3);
  }
  g.fillStyle = PAPER;
  g.fillRect(0, 0, sheetW, sheetH);
  // the paper's own cut edge. Without it a white sheet on a white room is only its ruled border,
  // and the border reads as a frame hanging in the air rather than as a thing lying on top.
  rule(g, 0, 0, sheetW, 0, pen * 0.72, nib, 2);
  rule(g, sheetW, 0, sheetW, sheetH, pen * 0.72, nib, 2);
  rule(g, sheetW, sheetH, 0, sheetH, pen * 0.72, nib, 2);
  rule(g, 0, sheetH, 0, 0, pen * 0.72, nib, 2);

  // ---- the double border, like the board the notice comes from ---------------------------------
  const in1 = Math.max(6, sheetW * 0.022);
  const in2 = in1 + Math.max(3.5, pen * 2.4);
  rule(g, in1, in1, sheetW - in1, in1, pen * 1.25, nib, 5);
  rule(g, sheetW - in1, in1, sheetW - in1, sheetH - in1, pen * 1.25, nib, 5);
  rule(g, sheetW - in1, sheetH - in1, in1, sheetH - in1, pen * 1.25, nib, 5);
  rule(g, in1, sheetH - in1, in1, in1, pen * 1.25, nib, 5);
  rule(g, in2, in2, sheetW - in2, in2, pen * 0.62, nib, 3);
  rule(g, sheetW - in2, in2, sheetW - in2, sheetH - in2, pen * 0.62, nib, 3);
  rule(g, sheetW - in2, sheetH - in2, in2, sheetH - in2, pen * 0.62, nib, 3);
  rule(g, in2, sheetH - in2, in2, in2, pen * 0.62, nib, 3);

  // ---- the heading -----------------------------------------------------------------------------
  const boil = o.parity;
  signCaps(g, BILL.head, sheetW / 2, o.yHead, { capH: o.capHead, tracking: 0.26, pen: Math.max(1.5, o.capHead * 0.135), seed: 31, boil });
  rule(g, o.pad, o.yRule1, sheetW - o.pad, o.yRule1, pen * 0.9, nib, 4);

  // ---- the four things a visitor needs to know -------------------------------------------------
  let y = o.yBody + o.capBody * 0.5;
  o.items.forEach((it, i) => {
    signCaps(g, it.n, o.pad + o.numW - o.capBody * 0.72, y, { capH: o.capBody, tracking: 0.16, pen: Math.max(1.4, o.capBody * 0.13), align: 'right', seed: 40 + i, boil });
    it.lines.forEach((ln, k) => {
      signCaps(g, ln, o.pad + o.numW, y + k * o.lead, { capH: o.capBody, tracking: TRACK, pen: Math.max(1.4, o.capBody * 0.125), align: 'left', seed: 60 + i * 7 + k, boil });
    });
    y += it.lines.length * o.lead + o.capBody * 0.62;
  });

  // ---- the small print -------------------------------------------------------------------------
  rule(g, o.pad, o.yRule2, sheetW - o.pad, o.yRule2, pen * 0.62, nib, 3);
  o.foot.forEach((ln, k) => {
    signCaps(g, ln, sheetW / 2, o.yFoot + o.capFoot * 0.85 + k * o.capFoot * 1.7, { capH: o.capFoot, tracking: 0.14, pen: Math.max(1.25, o.capFoot * 0.115), seed: 90 + k, boil, alpha: 0.9 });
  });

  // ---- the two things a visitor may do about it ------------------------------------------------
  for (const b of o.boxes) {
    rule(g, b.x, b.y, b.x + b.w, b.y, pen * 1.1, nib, 4);
    rule(g, b.x + b.w, b.y, b.x + b.w, b.y + b.h, pen * 1.1, nib, 4);
    rule(g, b.x + b.w, b.y + b.h, b.x, b.y + b.h, pen * 1.1, nib, 4);
    rule(g, b.x, b.y + b.h, b.x, b.y, pen * 1.1, nib, 4);
    signCaps(g, b.label, b.x + b.w / 2, b.y + b.h / 2, { capH: o.capCtrl, tracking: 0.2, pen: Math.max(1.45, o.capCtrl * 0.14), seed: b.key === 'leave' ? 121 : 122, boil });
  }
  return c;
}

// a ruled line with a pen's overshoot at both ends
function rule(g, x1, y1, x2, y2, width, rng, over = 4) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const a = over * rng(), b = over * rng();
  inkLine(g, x1 - ux * a, y1 - uy * a, x2 + ux * b, y2 + uy * b, { width, wobble: 0.85, rng, color: INK });
}
