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
// signWidth, so a 390 px phone gets the same notice with more turns in it. (The one line set
// smaller than that is the credit at the foot — 12 px on a phone. It is a signature, not an
// instruction: nobody has to read it to know what to do.)
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signWidth } from './titles-sign.js';

// The notice, in the room's own voice. Short: a handbill, not a manual.
export const BILL = {
  head: 'NOTICE TO VISITORS',
  items: [
    ['I', 'TALK TO HIM. HE ANSWERS.'],
    ['II', 'THE CARDS COME OUT ONLY IF YOU ASK FOR THEM.'],
    ['III', 'THEN TAKE THREE. TAP THEM, ONE AT A TIME.'],
  ],
  foot: 'THE HOUSE IS NOT RESPONSIBLE FOR THE CARDS.',
  controls: [
    { key: 'close', label: 'VERY WELL' },
    { key: 'leave', label: 'I AM LEAVING' },
    // The sheet the visitor takes away with them (help-keep.js). It is the third thing a visitor
    // may do about the notice and it is SET BACK — struck at a third of the ink, rules and
    // lettering alike — until there is a reading to keep. The bill has no other language for an
    // inactive thing: nothing here greys out, nothing here is disabled, so the answer is the one
    // the pen already gives the credit at the foot — less ink. It still occupies its box, because
    // a control that appears when the evening has begun is a control nobody knew was there.
    { key: 'keep', label: 'KEEP THIS READING' },
  ],
};

// The hand that drew the shop, at the foot of its own notice — the smallest print on the sheet and
// the only line on it that is not about the room. The handle is the link: it is struck at full ink
// and ruled under, and «CONJURED BY» is set back, so the part that leads somewhere is the part that
// looks touched. There is no at-sign in the sign hand (titles-sign.js is a case of caps, numerals
// and points), so the «@» is cut here, by the same pen, and boils with the rest.
export const CREDIT = {
  by: 'CONJURED BY',
  handle: 'SCRPTDFNTSY',
  href: 'https://x.com/scrptdfntsy',
};

const BLEED = 26; // room on the plate for the border's overshoot and the drop-hatch
const TRACK = 0.16; // the body's tracking; the heading is wider
const CRED_TRACK = 0.15;
export const AT_ADV = 104; // the at-sign's advance, in the case's own units (cap height = 100)
const SET_BACK = 0.32; // the ink a control has when there is nothing for it to do

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
 * Set the notice for a frame of w x h CSS px. Returns the sheet's box, the control boxes (all
 * in CSS px, relative to the frame, with the sheet at rest) and the plates to blit.
 * `inactive` names control keys that are struck SET BACK — a third of the ink — and do nothing.
 */
export function cutBill(w, h, dpr = 2, { inactive = [] } = {}) {
  // The notice is set at the largest hand that leaves it whole in the frame, and never at a cap
  // below the 13 px the world's rules put on lettering. A phone gets the same words with more
  // turns in them, not smaller words.
  let L = null;
  for (const k of [1, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58]) {
    L = layout(w, h, k);
    if (L.sheetH <= h * 0.9) break;
    if (L.capBody <= 13.01) break; // the floor: no smaller hand than this
  }
  return plate(w, h, dpr, { ...L, off: new Set(inactive) });
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

  // the controls: as many to a row as the measure takes, and a new row when it does not. Two of
  // them used to fit side by side on any sheet and three do not, so the block is packed rather
  // than switched — «VERY WELL» and «I AM LEAVING» keep their row on a laptop and «KEEP THIS
  // READING» goes under them; a phone stacks all three, as it stacked two.
  // 44 px is the floor for a control a thumb has to hit, whatever the lettering in it measures
  const ctrlPadX = capCtrl * 1.15, ctrlH = Math.max(44, capCtrl * 2.6), ctrlGap = capCtrl * 0.9;
  const ctrlW = BILL.controls.map((c) => signWidth(c.label, { capH: capCtrl, tracking: 0.2 }) + 2 * ctrlPadX);
  const ctrlMeasure = sheetW - 2 * pad;
  const rows = [];
  BILL.controls.forEach((c, i) => {
    const row = rows[rows.length - 1];
    const next = row ? row.w + ctrlGap + ctrlW[i] : ctrlW[i];
    if (row && next <= ctrlMeasure) {
      row.idx.push(i);
      row.w = next;
    } else rows.push({ idx: [i], w: ctrlW[i] });
  });
  // a sheet that stacks every control gives each one the whole measure, as it always did; a sheet
  // that does not keeps the natural widths, centred, so a lone control is not a bar under a pair
  const allSingle = rows.every((r) => r.idx.length === 1);
  const rowGap = ctrlGap * 0.7;
  const ctrlBlockH = rows.length * ctrlH + (rows.length - 1) * rowGap;

  // the double border, hoisted out of the strike so the credit knows where the inner rule runs
  const in1 = Math.max(6, sheetW * 0.022);
  const in2 = in1 + Math.max(3.5, pen * 2.4);

  // ---- the credit line, set to the measure ----------------------------------------------------
  // It lives in the margin the sheet already had under its controls. If that margin is not deep
  // enough for it — a phone's is not — the gap between the small print and the controls gives the
  // difference up, so the sheet ends exactly as tall as it was before anybody signed it.
  const cred = setCredit(sheetW - 2 * pad, capFoot);
  // Clear of the controls — and further clear of them since there are three. The signature is a
  // LINK, and with the last control stacked directly over it a thumb that overshoots «KEEP THIS
  // READING» by a few pixels used to land on x.com. A cap and a sixth of paper between the two,
  // and the link's own box started below that gap (see cred.box), is what stops it.
  // The signature gets its own band at the foot, and the sheet grows to hold it: a cap and a half
  // of paper above the line, a cap below it before the inner rule. (The user, on the old sheet:
  // "give conjured by @scrptdfntsy a bit more space - its squished into the bottom".) If the taller
  // sheet does not fit the screen, the fit loop above takes the whole notice down a size; the
  // signature is never the thing that gives.
  const credTop = Math.max(18, cred.cap * 1.6);
  const credBot = in2 + Math.max(12, cred.cap * 1.0); // clear of the inner rule
  const preCtrl = pad * 0.72;

  const yHead = pad + capHead * 0.5;
  const yRule1 = yHead + capHead * 0.5 + pad * 0.62;
  const yBody = yRule1 + pad * 0.72;
  const yRule2 = yBody + bodyH + pad * 0.5;
  const yFoot = yRule2 + pad * 0.5;
  const yCtrl = yFoot + foot.length * capFoot * 1.7 + preCtrl;
  const yCred = yCtrl + ctrlBlockH + credTop; // the credit's cap line
  const sheetH = Math.round(yCred + cred.cap + credBot);

  // where it is lettered, and the box a thumb has to hit — the whole line, not only the handle
  cred.x = Math.round((sheetW - cred.w) / 2);
  cred.capY = yCred;
  cred.box = {
    x: Math.max(pad * 0.4, cred.x - cred.cap * 1.1),
    // everything under the controls and inside the border is the credit — except a dead strip
    // directly under the last control, so a thumb that misses it low misses everything
    y: yCtrl + ctrlBlockH + Math.max(5, cred.cap * 0.5),
    w: Math.min(sheetW - 2 * (pad * 0.4), cred.w + cred.cap * 2.2),
    h: 0,
  };
  cred.box.w = Math.min(cred.box.w, sheetW - pad * 0.4 - cred.box.x);
  cred.box.h = sheetH - Math.max(2, in2 * 0.4) - cred.box.y; // down to the border, and no further

  // ---- where the controls sit, in sheet coordinates -------------------------------------------
  const boxes = [];
  rows.forEach((r, ri) => {
    const y = yCtrl + ri * (ctrlH + rowGap);
    if (allSingle) {
      const i = r.idx[0];
      boxes.push({ key: BILL.controls[i].key, label: BILL.controls[i].label, x: pad, y, w: ctrlMeasure, h: ctrlH });
      return;
    }
    let x = (sheetW - r.w) / 2;
    for (const i of r.idx) {
      boxes.push({ key: BILL.controls[i].key, label: BILL.controls[i].label, x, y, w: ctrlW[i], h: ctrlH });
      x += ctrlW[i] + ctrlGap;
    }
  });

  return { sheetW, sheetH, pen, pad, capBody, capHead, capFoot, capCtrl, numW, lead, items, foot, boxes, cred, in1, in2, yHead, yRule1, yBody, yRule2, yFoot };
}

// Set «CONJURED BY @SCRPTDFNTSY» in one line at the smallest hand on the sheet, and say where each
// of its three parts starts: the words, the at-sign cut here, and the handle that is the link.
function setCredit(measure, capFoot) {
  let cap = Math.max(12, Math.min(15, capFoot * 0.82));
  const put = () => {
    const track = CRED_TRACK * (cap / 0.72);
    const wBy = signWidth(CREDIT.by, { capH: cap, tracking: CRED_TRACK });
    const wHandle = signWidth(CREDIT.handle, { capH: cap, tracking: CRED_TRACK });
    const wAt = (cap * AT_ADV) / 100;
    const gap = cap * 0.85; // the word space: an at-sign set close reads as part of the word before it
    return { cap, wBy, wAt, wHandle, track, gap, w: wBy + gap + wAt + track + wHandle };
  };
  let m = put();
  if (m.w > measure) {
    cap = Math.max(10, cap * (measure / m.w)); // a narrow sheet gets a smaller signature, not a turn
    m = put();
  }
  // the handle, and the rule under it, run from the at-sign to the end of the name
  return { ...m, byX: 0, atX: m.wBy + m.gap, handleX: m.wBy + m.gap + m.wAt + m.track, x: 0, capY: 0, box: null };
}

// Strike the laid-out notice twice — one plate for each parity of the two — and say where it sits.
function plate(w, h, dpr, L) {
  const plates = [0, 1].map((parity) => strike(L.sheetW, L.sheetH, dpr, { ...L, parity }));
  const x0 = Math.round((w - L.sheetW) / 2);
  const y0 = Math.round((h - L.sheetH) / 2);
  return {
    sheet: { x: x0, y: y0, w: L.sheetW, h: L.sheetH },
    controls: L.boxes.map((b) => ({ key: b.key, x: x0 + b.x, y: y0 + b.y, w: b.w, h: b.h, inactive: !!L.off?.has(b.key) })),
    // the credit's box, in the same coordinates as the controls, and where it goes
    credit: { x: x0 + L.cred.box.x, y: y0 + L.cred.box.y, w: L.cred.box.w, h: L.cred.box.h, href: CREDIT.href },
    plates,
    bleed: BLEED,
    capBody: L.capBody,
    capFoot: L.capFoot,
    capCtrl: L.capCtrl,
    capCredit: L.cred.cap,
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
  const in1 = o.in1, in2 = o.in2;
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

  // ---- the things a visitor may do about it ----------------------------------------------------
  // One of them may have nothing to do yet — there is no reading to keep before there is a
  // reading — and then the whole control, its box and its lettering alike, is struck at a third of
  // the ink. Not hidden, not greyed, not crossed out: a printer with one colour of ink and a light
  // hand, which is the only way this sheet has ever said "later".
  const SEED = { close: 122, leave: 121, keep: 123 };
  for (const b of o.boxes) {
    const a = o.off?.has(b.key) ? SET_BACK : 1;
    rule(g, b.x, b.y, b.x + b.w, b.y, pen * 1.1, nib, 4, a);
    rule(g, b.x + b.w, b.y, b.x + b.w, b.y + b.h, pen * 1.1, nib, 4, a);
    rule(g, b.x + b.w, b.y + b.h, b.x, b.y + b.h, pen * 1.1, nib, 4, a);
    rule(g, b.x, b.y + b.h, b.x, b.y, pen * 1.1, nib, 4, a);
    signCaps(g, b.label, b.x + b.w / 2, b.y + b.h / 2, { capH: o.capCtrl, tracking: 0.2, pen: Math.max(1.45, o.capCtrl * 0.14), seed: SEED[b.key] ?? 122, boil, alpha: a });
  }

  // ---- and who conjured it ----------------------------------------------------------------------
  // Under the controls, in the margin the sheet already had: the words set back to seven tenths of
  // the ink, the name at full strength with a rule under it. Nothing here is blue and nothing is
  // underlined but the name, which is the whole of the sign that it goes somewhere.
  const cr = o.cred;
  const credPen = Math.max(1.15, cr.cap * 0.11);
  const mid = cr.capY + cr.cap * 0.5;
  signCaps(g, CREDIT.by, cr.x + cr.byX, mid, { capH: cr.cap, tracking: CRED_TRACK, pen: credPen, align: 'left', seed: 140, boil, alpha: 0.68 });
  atSign(g, cr.x + cr.atX, cr.capY, cr.cap, credPen * 1.02, nib);
  signCaps(g, CREDIT.handle, cr.x + cr.handleX, mid, { capH: cr.cap, tracking: CRED_TRACK, pen: credPen * 1.06, align: 'left', seed: 141, boil });
  const uy = cr.capY + cr.cap * 1.24;
  rule(g, cr.x + cr.atX - cr.cap * 0.06, uy, cr.x + cr.handleX + cr.wHandle, uy, credPen * 0.72, nib, 2);
  return c;
}

// The at-sign, cut here because the sign hand has none: one ring left open at the foot, the pen's
// flick out of it, and the little bowl inside. Same nib as the rules, so it boils with them.
// (help-keep.js signs the kept sheet with the same mark, so it is exported rather than copied.)
export function atSign(g, x, capY, capH, pen, rng) {
  // The mark is wider than a letter and fills the whole cap band — an at-sign is a big sort — and
  // the ring is drawn a hair finer than the letters beside it so the middle stays white.
  const cx = x + (capH * AT_ADV) / 200, cy = capY + capH * 0.5;
  const R = capH * 0.4, Ry = capH * 0.5;
  const wob = Math.max(0.12, capH * 0.022);
  const ring = [];
  for (let i = 0; i <= 26; i++) {
    const a = 0.44 * Math.PI + 1.74 * Math.PI * (i / 26); // round from the foot to the right side
    ring.push([cx + R * Math.cos(a), cy + Ry * Math.sin(a)]);
  }
  penPath(g, ring, pen, wob, rng);
  // the ring stops at the right, where the pen turns down and out again — the whole of the mark's
  // right-hand side is that one flick, and it is what tells it from a Q
  const [ex, ey] = ring[ring.length - 1];
  penPath(g, [[ex, ey], [ex + R * 0.3, ey + Ry * 0.34], [ex + R * 0.44, ey - Ry * 0.04]], pen * 0.86, wob, rng);
  // the bowl inside, kept small and light: at this size a fat one fills the ring and the whole mark
  // goes black, which is how a hand-cut at-sign turns into a full stop in a circle.
  const bowl = [];
  for (let i = 0; i <= 14; i++) {
    const a = 0.2 * Math.PI + 1.8 * Math.PI * (i / 14);
    bowl.push([cx - R * 0.05 + R * 0.44 * Math.cos(a), cy + Ry * 0.38 * Math.sin(a)]);
  }
  penPath(g, bowl, pen * 0.7, wob * 0.5, rng);
}

// A polyline drawn with a pen that shakes — inkLine only takes two points.
function penPath(g, pts, width, wobble, rng) {
  g.save();
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([px, py], i) => {
    const jx = px + (rng() - 0.5) * 2 * wobble, jy = py + (rng() - 0.5) * 2 * wobble;
    i ? g.lineTo(jx, jy) : g.moveTo(jx, jy);
  });
  g.lineWidth = width * (0.9 + rng() * 0.24);
  g.stroke();
  g.restore();
}

// a ruled line with a pen's overshoot at both ends
function rule(g, x1, y1, x2, y2, width, rng, over = 4, alpha = 1) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const a = over * rng(), b = over * rng();
  inkLine(g, x1 - ux * a, y1 - uy * a, x2 + ux * b, y2 + uy * b, { width, wobble: 0.85, rng, color: INK, alpha });
}
