// help-keep — THE SHEET THE VISITOR TAKES AWAY.
//
// The user: "export their reading, incl the cards maybe as one nice pdf that is in the style of
// whole animation - they should also have a transcript of what has previously been said during the
// reading."
//
// So this is not a data export. It is one more printed thing the shop hands over, cut by the same
// pen as the notice on the wall (help-bill.js) and set in the same two hands the room already
// uses, and the visitor leaves with it in their pocket:
//
//   ONE HAND, FOR ALL OF IT (round 2). The head, the date, the cards' names, the signature at the
//     foot and — since the placard stopped setting its words in a face and started lettering them
//     (dialogue.js, round 12) — the TRANSCRIPT as well: titles-sign.js, the same alphabet that cut
//     NOTICE TO VISITORS on the wall. There is no typeface anywhere on this sheet.
//     Two registers and no names on either of them: Pepe is his green #3a7736, the visitor is ink,
//     and the colour is the whole of the distinction. That is the placard's convention and it is
//     identical here, in print.
//
//   THE PAPER is PAPER #f8f9f4, never white, ruled with the notice's own double border.
//   THE FOOT of every page is the same signature the notice carries, at the smallest hand, with
//     the at-sign cut by hand because the case has none (help-bill.js, atSign).
//
// It does not boil. A boil is a held drawing re-struck twelve times a second; a sheet of paper in
// somebody's hand is struck once. Everything else about it is the same object as the room.
//
// WHAT IS ON IT. Page 1: TAROT PEPE, the date and time of the reading in the visitor's own clock,
// the cards they drew lying side by side in the order they lie on the cloth with their names under
// them, and the transcript beginning underneath if there is room for it. Then as many pages of
// transcript as it takes.
//
// HOW IT BECOMES A PDF, and why there is no library. Every page is a raster — it is a drawing, not
// a document with text in it — so a PDF of it is five objects a page and an xref table: a Page, a
// content stream that says "draw this image over the whole MediaBox", and the JPEG bytes the canvas
// already gives us, embedded whole with /DCTDecode. That is the writer below, and it is shorter
// than the import statement for a library that would do the same thing with 380 KB of machinery
// for laying out text we are not laying out. The output is PDF 1.4 and opens in CoreGraphics
// (Preview, iOS Quick Look, the share sheet's own preview), pdfium (Chrome) and poppler.
//
// THE PAGE IS RASTERED AT 3x — 216 dpi at A5 — rather than at 2x (144 dpi), and that was decided by
// looking: tools/_keep-r1-scale.mjs cuts the same strip of the sheet out of both rasters and blows
// them up to the same size (public/progress/keep-r1-raster-2x.png, -3x.png). At 2x the sign hand
// goes blunt; at 3x it keeps its edge. It costs about 500 KB a page instead of 250, which a share
// sheet does not notice — and it is what lets the transcript be lettered at all, since an 11 pt cap
// on the page is a 33 px cap on the plate, inside the band the hand was cut for.
//
// API (hung on ctx.pieces.help.keep):
//   readingNow(ctx)        {cards:[{slug,name}] left to right, transcript:[{role,text}], when:Date}
//   hasReading(ctx)        is there anything to keep yet
//   prepare(ctx)           start building; resolves {pages:[canvas], blob}
//   hand(ctx)              the visitor's tap: build if it is not built, then deliver
//   deliver(blob, {touch}) share sheet · new tab · download. MUST be called inside the gesture.
//   renderPages(reading)   the page canvases alone (the proof tool and ?view=keep use this)
//   pdfFrom(pages)         the pages as one application/pdf Blob
//   sampleReading()        a canned reading in the user's own words, for ?view=keep
//   last                   what the last hand() did: {path, ms, pages, blob}
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signWidth, signFold } from './titles-sign.js';
import { atSign, AT_ADV, CREDIT } from './help-bill.js';
import { SCRIPT, linesFor, reply as scriptReply } from './script.js';
import { PROMPTS, SAMPLE_ANSWER } from './flow-lines.js';

export const FILENAME = 'tarot-pepe-reading.pdf';

// A5 portrait, in PDF points — 420 x 595 rather than the exact 419.53 x 595.28, so that the page
// times any whole SCALE is a whole number of pixels and the raster has no half-pixel row at its
// edge to fill with something that is not paper. Half a point of A5 is a fortieth of a millimetre.
export const PAGE = { w: 420, h: 595 };
const SCALE = 3;

// The placard's own tracking, now that the placard letters its words rather than setting them.
const TRACK = 0.13;
const PEPE_GREEN = '#3a7736'; // his green, taken down until a sentence can be read in it
const REG_GAP = 0.62; // the paper between one turn and the next, in lines

// the sheet's own margins, in points
const IN1 = 13, IN2 = 16; // the double border, as the notice rules it
const PAD = 34; // the measure's margin
const MEASURE = PAGE.w - 2 * PAD;
const FOOT_CAP = 6.6;
const FOOT_Y = PAGE.h - 27; // the cap line of the signature
const BODY_TOP = 40; // where a continuation page starts
// …and where every page stops: four caps of the smallest hand above the signature, so the last
// line of a turn is never sitting on the foot of the sheet
const BODY_BOTTOM = FOOT_Y - FOOT_CAP * 4;

// THE TRANSCRIPT'S MEASURE, in page points. The typewriter face read at a cap of 8.6 pt; the sign
// hand does not — it is cut for cap heights of 20–40 px and holds down to 14, and the page is
// rastered at 3x, so a cap of 11 pt lands at 33 px on the plate, dead centre of the hand's band.
// (14–16 pt on the page itself would put the transcript at more than half the size of TAROT PEPE
// at the head of the sheet, which is a large-print book and not a keepsake.) The hand is wider than
// the face was, so the sheet runs to more pages: that is what the transcript costs to letter.
const BODY_CAP = 11;
const BODY_LEAD = BODY_CAP * 1.7; // the leading a case of caps wants, the notice's own

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// The date and time of the reading, in the visitor's own clock and in the case the hand holds.
// Built by hand rather than by toLocaleString, because the sign hand has A–Z, 0–9 and a short list
// of points, and a locale is free to hand back a month name it cannot letter.
export function stamp(d) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}.${mm}`;
}

// ---------------------------------------------------------------------------------------------
// WHAT THERE IS TO KEEP
// ---------------------------------------------------------------------------------------------
// The cards are the meshes lying on the cloth (cards.js hangs the card on each one's userData) and
// they are ordered by where they LIE, not by when they were picked: the camera's right is +x, so
// ascending x is left to right in every shot the row is ever seen in.
// The transcript is the mind's own history, which is the record of the conversation and nothing
// else — his sentences as he said them, the visitor's lines as they typed them.
export function readingNow(ctx) {
  const cards = (ctx?.pieces?.cards?.drawn?.children ?? [])
    .filter((m) => m?.userData?.card?.slug)
    .map((m) => ({ slug: m.userData.card.slug, name: m.userData.card.name ?? m.userData.card.slug, x: m.position?.x ?? 0 }))
    .sort((a, b) => a.x - b.x)
    .map(({ slug, name }) => ({ slug, name }));
  const transcript = (ctx?.pieces?.mind?.history ?? [])
    .map((h) => ({ role: h?.role === 'pepe' ? 'pepe' : 'visitor', text: String(h?.text ?? '').trim() }))
    .filter((h) => h.text);
  return { cards, transcript, when: new Date() };
}

export function hasReading(ctx) {
  const r = readingNow(ctx);
  return r.cards.length > 0 || r.transcript.length > 0;
}

const signature = (r) => `${r.cards.map((c) => c.slug).join(',')}|${r.transcript.map((t) => t.role[0] + t.text.length).join(',')}`;

// The canned reading behind ?view=keep, so the dev view draws a full sheet on a page where nobody
// has said anything yet. Every word of it is the user's own, taken from script.js and
// flow-lines.js and put in the order an evening puts them in. Nothing here is written by a builder.
export function sampleReading() {
  const cards = [
    { slug: 'the-fool', name: 'The Fool' },
    { slug: 'the-house-of-god', name: 'The House of God' },
    { slug: 'the-star', name: 'The Star' },
  ];
  const transcript = [
    { role: 'pepe', text: SCRIPT.greeting[0] },
    { role: 'pepe', text: SCRIPT.greeting[1] },
    { role: 'pepe', text: SCRIPT.question[0] },
    { role: 'visitor', text: SAMPLE_ANSWER },
    { role: 'pepe', text: scriptReply(SAMPLE_ANSWER) },
    { role: 'visitor', text: 'All right. Read my cards.' },
    { role: 'pepe', text: PROMPTS.pick[0] },
    ...cards.flatMap((c, i) => linesFor(c.slug, i).map((text) => ({ role: 'pepe', text }))),
    { role: 'pepe', text: PROMPTS.afterReading[0] },
    { role: 'visitor', text: 'Thank you. I should go.' },
    { role: 'pepe', text: SCRIPT.farewell[0] },
  ].filter((t) => t.text);
  return { cards, transcript, when: new Date() };
}

// ---------------------------------------------------------------------------------------------
// THE PEN
// ---------------------------------------------------------------------------------------------
// A ruled line with a pen's overshoot at both ends — the notice's own rule, in points.
function rule(g, x1, y1, x2, y2, width, rng, over = 3, alpha = 1) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const a = over * rng(), b = over * rng();
  inkLine(g, x1 - ux * a, y1 - uy * a, x2 + ux * b, y2 + uy * b, { width, wobble: 0.5, rng, color: INK, alpha });
}

function border(g, rng) {
  const pen = 1.15;
  for (const [i, w] of [[IN1, pen * 1.25], [IN2, pen * 0.62]]) {
    rule(g, i, i, PAGE.w - i, i, w, rng, 4);
    rule(g, PAGE.w - i, i, PAGE.w - i, PAGE.h - i, w, rng, 4);
    rule(g, PAGE.w - i, PAGE.h - i, i, PAGE.h - i, w, rng, 4);
    rule(g, i, PAGE.h - i, i, i, w, rng, 4);
  }
}

// The signature at the foot of every page — the notice's, word for word, at the smallest hand.
// «CONJURED BY» is set back and the handle is at full ink, the same relation the notice keeps,
// with the at-sign cut by the same hand because the case has none.
const FOOT_TAIL = `${CREDIT.handle} · TAROTPEPE.COM`;
function foot(g, rng) {
  const cap = FOOT_CAP, track = 0.15;
  const wBy = signWidth(CREDIT.by, { capH: cap, tracking: track });
  const wAt = (cap * AT_ADV) / 100;
  const wTail = signWidth(FOOT_TAIL, { capH: cap, tracking: track });
  const gap = cap * 0.85, tr = track * cap;
  const x = (PAGE.w - (wBy + gap + wAt + tr + wTail)) / 2;
  const mid = FOOT_Y + cap * 0.5;
  const pen = Math.max(0.62, cap * 0.115);
  signCaps(g, CREDIT.by, x, mid, { capH: cap, tracking: track, align: 'left', pen, seed: 210, alpha: 0.68 });
  atSign(g, x + wBy + gap, FOOT_Y, cap, pen * 1.02, rng);
  signCaps(g, FOOT_TAIL, x + wBy + gap + wAt + tr, mid, { capH: cap, tracking: track, align: 'left', pen: pen * 1.06, seed: 211 });
}

// ---- THE TRANSCRIPT, LETTERED -------------------------------------------------------------------
// One line of the record, struck by the same nib as everything else on the sheet. `y` is the
// baseline, as it was when this was set type, so the pagination above did not have to move.
function setLine(g, text, x, y, cap, color, seed) {
  signCaps(g, text, x, y, {
    capH: cap,
    tracking: TRACK,
    pen: Math.max(0.85, cap * 0.115),
    color,
    align: 'left',
    baseline: 'alphabetic',
    seed,
  });
}

// Cut one turn into lines of the measure, in the case the hand holds. Returns
// [{text, color, gapBefore}]. A visitor may have typed anything at all — the room answers in their
// language now — so the words go through signFold before they are measured.
function wrapTurn(turn, cap, maxW) {
  const color = turn.role === 'pepe' ? PEPE_GREEN : INK;
  const out = wrapSign(signFold(turn.text), cap, maxW, TRACK).map((text) => ({ text, color }));
  if (out.length) out[0].gapBefore = true;
  return out;
}

// A word the hand cannot wrap (a single sort longer than the measure) is not a case this room can
// produce — the placard would have the same trouble — so nothing tries to hyphenate.
function wrapSign(text, capH, maxW, tracking) {
  const words = text.split(' ');
  const out = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && signWidth(next, { capH, tracking }) > maxW) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// ---------------------------------------------------------------------------------------------
// THE PLATES
// ---------------------------------------------------------------------------------------------
const BACK_URL = '/cards/tarotcard-backside.webp';

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`card plate: ${url}`));
    img.src = url;
  });
}

async function plates(cards) {
  const want = cards.length ? cards : [{ slug: null, name: '' }];
  const out = [];
  for (const c of want) {
    const url = c.slug ? `/cards/${c.slug}.webp` : BACK_URL;
    let img = null;
    try {
      img = await loadImage(url);
    } catch {
      try {
        img = await loadImage(BACK_URL);
      } catch {
        img = null;
      }
    }
    out.push({ ...c, img });
  }
  return out;
}

// One card, lying on the sheet: the plate as printed, an ink contour round it whose strokes run
// past the corners, and the tight band of hatch below and to the right that says one sheet is
// lying on another (the notice's own mark for it).
function drawCard(g, img, x, y, w, h, rng) {
  const band = Math.max(3, w * 0.05);
  const stroke = (x0, y0, dx, dy) =>
    inkLine(g, x0, y0, x0 + dx, y0 + dy, { width: 0.5, wobble: 0.22, rng, alpha: 0.4 + rng() * 0.35 });
  for (let i = 0, n = Math.round(w / 0.9); i < n; i++) {
    const px = x + rng() * (w + band * 0.6);
    if (rng() < 0.34) continue;
    stroke(px, y + h + 0.3, (rng() - 0.5) * 0.9, band * (0.18 + 0.82 * rng() ** 1.7));
  }
  for (let i = 0, n = Math.round(h / 0.9); i < n; i++) {
    const py = y + rng() * (h + band * 0.6);
    if (rng() < 0.34) continue;
    stroke(x + w + 0.3, py, band * (0.18 + 0.82 * rng() ** 1.7), (rng() - 0.5) * 0.9);
  }
  g.save();
  g.fillStyle = PAPER;
  g.fillRect(x, y, w, h);
  if (img) {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, x, y, w, h);
  }
  g.restore();
  // the contour, four strokes that cross at every corner
  const o = 1.6;
  rule(g, x, y, x + w, y, 1.05, rng, o);
  rule(g, x + w, y, x + w, y + h, 1.05, rng, o);
  rule(g, x + w, y + h, x, y + h, 1.05, rng, o);
  rule(g, x, y + h, x, y, 1.05, rng, o);
}

// ---------------------------------------------------------------------------------------------
// THE SHEET
// ---------------------------------------------------------------------------------------------
function newPage(scale) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(PAGE.w * scale);
  c.height = Math.ceil(PAGE.h * scale);
  // willReadFrequently keeps the page on the CPU. It is drawn once and then read once, whole, by
  // the JPEG encoder, and a canvas that lives on the GPU pays for that read. Measured on the
  // software-rendered judging browser (tools/_keep-r1-time.mjs), two A5 pages: 4.9 s to encode off
  // the GPU, 2.1 s off the CPU at 2x — and the drawing itself costs the same either way (under
  // 30 ms). Nothing here is animated, so there is nothing to lose by giving up the acceleration.
  const g = c.getContext('2d', { alpha: false, willReadFrequently: true });
  // the paper is laid over the WHOLE raster, in device pixels, before the page's own units are
  // set: an opaque canvas starts black, and a row the page's units do not quite reach stays black
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  c.style.display = 'block';
  return { canvas: c, g };
}

/** Every page of the reading, as canvases, in order. */
export async function renderPages(reading, { scale = SCALE } = {}) {
  const cards = await plates(reading.cards ?? []);
  const turns = reading.transcript ?? [];
  const when = reading.when instanceof Date ? reading.when : new Date();

  const pages = [];
  let page = newPage(scale);
  let rng = mulberry32(0x7a3f01);
  border(page.g, rng);
  foot(page.g, rng);

  // ---- the head ------------------------------------------------------------------------------
  const g = page.g;
  const headCap = 26;
  signCaps(g, 'TAROT PEPE', PAGE.w / 2, 40 + headCap / 2, { capH: headCap, tracking: 0.3, pen: Math.max(2, headCap * 0.115), seed: 200 });
  const dateCap = 8.4;
  signCaps(g, stamp(when), PAGE.w / 2, 79 + dateCap / 2, { capH: dateCap, tracking: 0.22, pen: Math.max(0.8, dateCap * 0.115), seed: 201, alpha: 0.82 });
  rule(g, PAD, 99, PAGE.w - PAD, 99, 0.72, rng, 3);

  // ---- the cards, as they lie -----------------------------------------------------------------
  const gap = 13;
  const n = Math.min(3, Math.max(1, cards.length));
  // a card is always the size a card is when three of them lie in a row: one card is not a bigger
  // card, it is the same card with more cloth around it
  const cw = (MEASURE - 2 * gap) / 3;
  const ch = (cw * 1792) / 1024; // the deck's own aspect (layout.js: 0.13 x 0.2275)
  const top = 112;
  let cx = (PAGE.w - (n * cw + (n - 1) * gap)) / 2;
  const nameCap = 7.4;
  let nameRows = 1;
  for (const c of cards.slice(0, 3)) {
    drawCard(g, c.img, cx, top, cw, ch, rng);
    // the back has no name, and a sheet does not caption a card nobody drew
    const lines = c.name ? wrapSign(signFold(c.name), nameCap, cw, 0.17) : [];
    nameRows = Math.max(nameRows, lines.length);
    lines.forEach((ln, i) => {
      signCaps(g, ln, cx + cw / 2, top + ch + 11 + i * nameCap * 1.7 + nameCap / 2, { capH: nameCap, tracking: 0.17, pen: Math.max(0.8, nameCap * 0.12), seed: 220 + i });
    });
    cx += cw + gap;
  }
  const afterCards = top + ch + 11 + nameRows * nameCap * 1.7 + 8;
  rule(g, PAD, afterCards, PAGE.w - PAD, afterCards, 0.62, rng, 3);

  // ---- the transcript, paginated ---------------------------------------------------------------
  // A TURN IS NOT BROKEN ACROSS A PAGE unless it is longer than a page, because a sentence whose
  // first line is at the foot of one sheet and whose second is at the head of the next is not a
  // sentence anybody reads twice. So the transcript is paginated in BLOCKS — one block per turn —
  // and a block that does not fit the room left goes over whole.
  const blocks = turns.map((t) => wrapTurn(t, BODY_CAP, MEASURE)).filter((b) => b.length);

  let y = afterCards + 16 + BODY_CAP;
  // and if page one has no room left worth starting in, the transcript begins on page two rather
  // than leaving a widow under the cards
  if (y + 3 * BODY_LEAD > BODY_BOTTOM) y = Infinity;

  const nextPage = () => {
    pages.push(page.canvas);
    page = newPage(scale);
    rng = mulberry32(0x7a3f01 + pages.length * 977);
    border(page.g, rng);
    foot(page.g, rng);
    return BODY_TOP + BODY_CAP;
  };
  // y is always the baseline the next line will be set on; a block's own depth is the span from
  // its first baseline to its last
  const pageRoom = BODY_BOTTOM - (BODY_TOP + BODY_CAP);
  let first = true;
  for (const block of blocks) {
    const deep = (block.length - 1) * BODY_LEAD;
    const top = y === Infinity ? Infinity : first ? y : y + BODY_LEAD * REG_GAP;
    // over whole if this page cannot hold all of it and a page of its own could; a turn longer
    // than a whole page has to break somewhere, and breaks at the foot like anything else
    if (top === Infinity || (top + deep > BODY_BOTTOM && deep <= pageRoom)) y = nextPage();
    else y = top;
    first = false;
    for (const ln of block) {
      if (y > BODY_BOTTOM) y = nextPage();
      setLine(page.g, ln.text, PAD, y, BODY_CAP, ln.color, 300 + (y | 0));
      y += BODY_LEAD;
    }
  }
  pages.push(page.canvas);
  return pages;
}

// ---------------------------------------------------------------------------------------------
// THE PDF
// ---------------------------------------------------------------------------------------------
// One page = one image. The canvas hands us JPEG bytes and /DCTDecode takes them whole, so the
// writer below only has to name the objects and count their offsets.
const jpeg = (canvas, q = 0.94) =>
  new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a)), rej) : rej(new Error('canvas: no jpeg'))), 'image/jpeg', q),
  );

const pdfDate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const s = off < 0 ? '-' : '+';
  return `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${s}${p(Math.floor(Math.abs(off) / 60))}'${p(Math.abs(off) % 60)}'`;
};

/** The pages, in order, as one application/pdf Blob. */
export async function pdfFrom(canvases, { when = new Date() } = {}) {
  const enc = new TextEncoder();
  const chunks = [];
  let at = 0;
  const put = (x) => {
    const b = typeof x === 'string' ? enc.encode(x) : x;
    chunks.push(b);
    at += b.length;
  };
  const images = [];
  for (const c of canvases) images.push({ bytes: await jpeg(c), w: c.width, h: c.height });

  // 1 catalog · 2 pages · then Page, Contents, Image for each page · finally the info dictionary
  const n = images.length;
  const total = 3 + 3 * n; // objects 1 … 2+3n, plus the info at 3+3n
  const off = new Array(total + 1).fill(0);
  const obj = (i, body) => {
    off[i] = at;
    put(`${i} 0 obj\n`);
    put(body);
    put('\nendobj\n');
  };

  put(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a])); // %PDF-1.4
  put(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // the binary comment every writer puts here

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const kids = images.map((_, i) => `${3 + 3 * i} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);

  images.forEach((im, i) => {
    const pageId = 3 + 3 * i, contentId = pageId + 1, imgId = pageId + 2;
    obj(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.w.toFixed(2)} ${PAGE.h.toFixed(2)}]` +
        ` /Resources << /XObject << /Im0 ${imgId} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentId} 0 R >>`,
    );
    const content = `q ${PAGE.w.toFixed(2)} 0 0 ${PAGE.h.toFixed(2)} 0 0 cm /Im0 Do Q\n`;
    obj(contentId, `<< /Length ${content.length} >>\nstream\n${content}endstream`);
    off[imgId] = at;
    put(`${imgId} 0 obj\n`);
    put(
      `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB` +
        ` /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`,
    );
    put(im.bytes);
    put('\nendstream\nendobj\n');
  });

  const infoId = 3 + 3 * n;
  // ASCII only: a PDF literal string is PDFDocEncoded, and an em dash sent as UTF-8 arrives in the
  // viewer's title bar as two characters of rubbish
  obj(infoId, `<< /Title (Tarot Pepe - a reading) /Producer (Tarot Pepe) /CreationDate (${pdfDate(when)}) >>`);

  const xref = at;
  let table = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= total; i++) table += `${String(off[i]).padStart(10, '0')} 00000 n \n`;
  put(table);
  put(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------------------------
// HANDING IT OVER
// ---------------------------------------------------------------------------------------------
// A phone will not open a share sheet for a page that asks for one a second after the tap: the
// gesture has to still be warm. So the sheet is BUILT BEFORE IT IS ASKED FOR — prepare() runs when
// the notice comes up — and hand() finds the blob already in its pocket and calls share()
// synchronously inside the click. If it is not ready (a very slow phone, a reading that grew while
// the notice was open) it is awaited and shared anyway; Chromium and WebKit both hold transient
// activation for five seconds, and a build is well under one.
let cache = null; // { sig, p, blob }

export function prepare(ctx) {
  const r = readingNow(ctx);
  const sig = signature(r);
  if (cache && cache.sig === sig) return cache.p;
  const p = (async () => {
    const pages = await renderPages(r);
    const blob = await pdfFrom(pages, { when: r.when });
    return { pages, blob, reading: r };
  })();
  const entry = { sig, p, blob: null, pages: null };
  cache = entry;
  p.then((v) => {
    entry.blob = v.blob;
    entry.pages = v.pages;
  }).catch(() => {});
  return p;
}

/** Is the sheet for the reading as it stands right now already made and waiting? */
export function ready(ctx) {
  return !!(cache && cache.blob && cache.sig === signature(readingNow(ctx)));
}

const isTouch = () =>
  (navigator.maxTouchPoints ?? 0) > 0 || (window.matchMedia?.('(pointer: coarse)')?.matches ?? false);

/**
 * Put the sheet in the visitor's hands. MUST be called synchronously inside the tap.
 * Returns 'share' | 'tab' | 'download'.
 */
export function deliver(blob, { touch = isTouch(), filename = FILENAME } = {}) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (touch && navigator.canShare?.({ files: [file] }) && navigator.share) {
    // the share sheet is the phone's own answer to "keep this": mail it, save it to Files, print it
    Promise.resolve(navigator.share({ files: [file], title: 'Tarot Pepe — a reading' })).catch((e) => {
      if (e?.name !== 'AbortError') download(blob, filename, touch);
    });
    return 'share';
  }
  return download(blob, filename, touch);
}

function download(blob, filename, touch) {
  const url = URL.createObjectURL(blob);
  const done = () => setTimeout(() => URL.revokeObjectURL(url), 60000);
  // a phone with no share sheet gets the file in a tab, where its own viewer takes it from there;
  // a desktop gets the download it expects
  if (touch) {
    const win = window.open(url, '_blank', 'noopener');
    if (win) {
      done();
      return 'tab';
    }
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  done();
  return 'download';
}

/** The visitor's tap on «KEEP THIS READING». */
export function hand(ctx) {
  const t0 = performance.now();
  const p = prepare(ctx);
  const entry = cache;
  const give = ({ pages, blob }) => {
    const path = deliver(blob);
    api.last = { path, ms: Math.round(performance.now() - t0), pages, blob };
    return api.last;
  };
  // already in its pocket: share inside the gesture, with nothing awaited in between
  if (entry?.blob) return Promise.resolve(give({ pages: entry.pages, blob: entry.blob }));
  return p.then(give);
}

export const api = {
  FILENAME,
  PAGE,
  readingNow,
  hasReading,
  sampleReading,
  renderPages,
  pdfFrom,
  prepare,
  ready,
  deliver,
  hand,
  stamp,
  last: null,
};

// ---------------------------------------------------------------------------------------------
// ?view=keep — page one, in the DOM, so the views checker can look at it
// ---------------------------------------------------------------------------------------------
// It goes straight into #overlay rather than #ui, because main.js hides #ui for any view that is
// not a DOM piece and `keep` is not a piece: it is what the notice does.
export async function mountView(ctx) {
  const reading = hasReading(ctx) ? readingNow(ctx) : sampleReading();
  const pages = await renderPages(reading, { scale: 2 });
  const root = document.createElement('div');
  root.id = 'keep-view';
  Object.assign(root.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2vh',
    background: PAPER,
    pointerEvents: 'none',
  });
  for (const c of pages.slice(0, 2)) {
    c.style.height = '96vh';
    c.style.width = 'auto';
    c.style.maxWidth = `${100 / Math.min(2, pages.length) - 3}vw`;
    c.style.objectFit = 'contain';
    root.appendChild(c);
  }
  ctx.dom.overlay.appendChild(root);
  return pages;
}
