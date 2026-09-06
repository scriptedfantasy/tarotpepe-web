#!/usr/bin/env node
// back-plate — the user's card back, re-inked into the film's palette.
//
// THE SOURCE IS THEIRS AND IS NEVER TOUCHED. `public/tarotpepe_backside.png` (1024 x 1792, the same
// plate size as every card face) goes in; `public/tarotpepe-back-ink.png` (and the title variant
// `-panel`) come out. Nothing in the pipeline writes back over the original — this script only
// reads it — and `?back=orig` in the page puts the untreated file on the card for a comparison.
//
// WHY A BUILD-TIME PLATE AND NOT A LIVE PASS. The conversion below is a dozen whole-image passes
// (a distance transform, two flood fills, a local-contrast threshold): 1.8 Mpx each, ~2 s in node.
// Doing that in the browser would put two seconds on the cards build, in a project where a build
// over 1500 ms is a hard failure, and would hide the one thing that most needs looking at — the
// plate itself — inside a texture. As a file it can be opened, zoomed and argued with.
//
// WHAT THE CONVERSION IS. The world's rule (BRIEF.md) is ink #0d0e0d on paper #f8f9f4, tone from
// hatching, and SELECTIVE COLOUR: only Pepe and the faces of the cards carry any. So:
//   · every green wall, green ceiling and green-brown floorboard becomes PAPER. Their drawn lines —
//     the cornice, the window mullions, the rooftops, the board seams — become INK. The room is a
//     pen drawing.
//   · the seated Pepe keeps his colour, and it is the puppet's colour: SKIN #69b964 and LIPS
//     #d37a6c, imported from pepe.js so the figure on the back is the same frog as the figure on
//     the bench. Flat fills, exactly as the puppet's sheet is drawn — the drawing's own shading in
//     his skin is flattened out, because a fill with a gradient in it is the grey wash the rules
//     forbid. His robe is paper with ink lines, as it is on the puppet.
//   · his SILHOUETTE gets a pen line of its own. In the original the white robe sits on a pale
//     floor and the figure dissolves into it; the drawing implies that contour and never draws it.
//     Here it is a 3 px stroke on the mask's own boundary, its width breathing on a low-frequency
//     noise so it is a pen line and not an offset path, and it is laid so the floorboards run up to
//     it and stop — the boards run BEHIND him instead of through him.
//   · the TITLE. `tarotpepe` is cream lettering on a green wall: threshold that and the letters and
//     the wall both go to paper, which is the blank band across the top of every card today. The
//     letters are found by their own value inside a box that clears the corner ornaments, and then
//     either (--title ink) inked, keeping the user's letterforms and putting them on paper the way
//     the film letters a shopfront, or (--title panel) knocked out white inside a filled ink tablet.
//
// Everything the pass decides is a THRESHOLD, never a fade: a mark is ink or it is paper. The one
// place a value between the two is allowed is the half pixel at a stroke's own edge — the film's
// line has that and BRIEF.md says so in as many words ("no grey" is a rule about tone, not about
// rasterisation).
//
//   node tools/back-plate.mjs                 # writes both variants
//   node tools/back-plate.mjs --debug         # + the masks, into public/progress/shots/_backplate-*
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const HERE = new URL('.', import.meta.url).pathname;
const SRC = HERE + '../public/tarotpepe_backside.png';
const OUT = HERE + '../public/';
const DEBUG = process.argv.includes('--debug');

// the world's two colours, and the puppet's two (src/core/strokes.js, src/pieces/pepe.js)
const INK = [13, 14, 13];        // #0d0e0d
const PAPER = [248, 249, 244];   // #f8f9f4
const SKIN = [105, 185, 100];    // #69b964
const LIPS = [211, 122, 108];    // #d37a6c

// ── the pen ───────────────────────────────────────────────────────────────────────────────────
// A mark is ink if it is darker than the dark core of its OWN neighbourhood (the local rule, which
// is what lets a window mullion on white paper and a board seam on a mid floor be inked with the
// same nib), capped by an absolute value so a broad dark FIELD is never flooded — the floor's
// boards average 141 and must stay paper, the grain lines that cross them run to 20 and must not.
const T_ABS = 112;    // nothing lighter than this is ever inked by the local rule
const CON_MIN = 46;   // and only where there is a mark to find: a flat field has no contrast
const BIAS = 0.34;    // how far the threshold sits from the midpoint toward the light side
const NBR = 4;        // the nib's reach, px
const ALWAYS = [74, 32]; // …and anything this dark is ink whatever its neighbourhood says

// the lettering, found by value inside a box that clears the corner ornaments
const TITLE = { x0: 296, y0: 100, x1: 736, y1: 216, lo: 196, hi: 226 };
// the tablet the panel variant knocks the letters out of
const TABLET = { x0: 274, y0: 88, x1: 758, y1: 226, r: 16 };

// PEPE. Found from OUTSIDE, not from inside. A first pass seeded a cell of him at a time and had to
// know where every cell was: his head alone is cut into a dozen by the eyelid creases, the jaw and
// the muzzle line, and the ones nobody named came out white — he sat there in white goggles with a
// white chin. Reading him from outside asks one question instead. Flood the BOX around a part from
// its border, over pixels the pen did not mark; whatever the flood cannot reach, taken as the
// single blob that holds the part's centre, is the part — every enclosed cell, every crease, the
// whites of his eyes and the outline itself, without anyone naming them.
const FIG = { x0: 256, y0: 630, x1: 792, y1: 1136, at: [510, 900] };
const SKIN_PARTS = [
  { x0: 418, y0: 645, x1: 652, y1: 812, at: [500, 730] }, // the head, cut off at the collar
  { x0: 274, y0: 946, x1: 378, y1: 1078, at: [318, 1004] }, // his right hand (frame left)
  { x0: 672, y0: 928, x1: 782, y1: 1058, at: [724, 984] }, // his left hand
  { x0: 372, y0: 1042, x1: 470, y1: 1118, at: [408, 1080] }, // his right foot
  { x0: 540, y0: 1038, x1: 664, y1: 1114, at: [604, 1076] }, // his left foot
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

const { data: src, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const idx = (x, y) => y * W + x;

// ── 1. luminance, and the local dark/light within a nib ───────────────────────────────────────
const lum = new Float32Array(N);
for (let i = 0; i < N; i++) { const o = i * 4; lum[i] = 0.299 * src[o] + 0.587 * src[o + 1] + 0.114 * src[o + 2]; }

// separable min / max over a (2*NBR+1) box
function boxExtreme(a, cmp) {
  const t = new Float32Array(N), out = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = a[idx(x, y)];
    for (let k = -NBR; k <= NBR; k++) { const v = a[idx(Math.min(W - 1, Math.max(0, x + k)), y)]; if (cmp(v, m)) m = v; }
    t[idx(x, y)] = m;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = t[idx(x, y)];
    for (let k = -NBR; k <= NBR; k++) { const v = t[idx(x, Math.min(H - 1, Math.max(0, y + k)))]; if (cmp(v, m)) m = v; }
    out[idx(x, y)] = m;
  }
  return out;
}
const tLo = boxExtreme(lum, (v, m) => v < m);
const tHi = boxExtreme(lum, (v, m) => v > m);

// ── 2. the ink coverage of the whole drawing ──────────────────────────────────────────────────
const cov = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const con = tHi[i] - tLo[i];
  const mid = (tHi[i] + tLo[i]) * 0.5 + (tHi[i] - (tHi[i] + tLo[i]) * 0.5) * BIAS;
  const t = Math.min(mid, T_ABS);
  const aa = Math.max(1.2, con * 0.035);
  const local = con >= CON_MIN ? ss(t + aa, t - aa, lum[i]) : 0;
  cov[i] = Math.max(ss(ALWAYS[0], ALWAYS[1], lum[i]), local);
}

// ── 3. the figure, read from outside ──────────────────────────────────────────────────────────
// A pixel is passable if the pen did not put a mark on it. For a box: flood it from its border
// over passable pixels; whatever the flood could not reach, taken as the one blob that holds the
// named point, is the thing in the box — its outline, its enclosed cells, its creases and all.
const passable = new Uint8Array(N);
for (let i = 0; i < N; i++) passable[i] = cov[i] < 0.42 ? 1 : 0;

function dilate(m, r) {
  const t = new Uint8Array(N), out = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) v = m[idx(Math.min(W - 1, Math.max(0, x + k)), y)]; t[idx(x, y)] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) v = t[idx(x, Math.min(H - 1, Math.max(0, y + k)))]; out[idx(x, y)] = v; }
  return out;
}
const erode = (m, r) => { const inv = new Uint8Array(N); for (let i = 0; i < N; i++) inv[i] = m[i] ? 0 : 1; const d = dilate(inv, r); const o = new Uint8Array(N); for (let i = 0; i < N; i++) o[i] = d[i] ? 0 : 1; return o; };

function regionIn(box) {
  const { x0, y0, x1, y1, at } = box;
  const reached = new Uint8Array(N);
  const st = [];
  const seed = (x, y) => { const i = idx(x, y); if (passable[i] && !reached[i]) { reached[i] = 1; st.push(i); } };
  for (let x = x0; x <= x1; x++) { seed(x, y0); seed(x, y1); }
  for (let y = y0; y <= y1; y++) { seed(x0, y); seed(x1, y); }
  while (st.length) {
    const i = st.pop(), x = i % W, y = (i - x) / W;
    const push = (j, jx, jy) => { if (jx < x0 || jx > x1 || jy < y0 || jy > y1) return; if (passable[j] && !reached[j]) { reached[j] = 1; st.push(j); } };
    push(i - 1, x - 1, y); push(i + 1, x + 1, y); push(i - W, x, y - 1); push(i + W, x, y + 1);
  }
  // the blob holding `at`, 8-connected so a diagonal of the pen line still joins two cells
  const out = new Uint8Array(N);
  const s0 = idx(at[0], at[1]);
  if (reached[s0]) { console.warn(`  ! (${at}) is not inside anything — the flood reached it`); return out; }
  out[s0] = 1;
  const q = [s0];
  let n = 1;
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const jx = x + dx, jy = y + dy;
      if (jx < x0 || jx > x1 || jy < y0 || jy > y1) continue;
      const j = idx(jx, jy);
      if (!reached[j] && !out[j]) { out[j] = 1; n++; q.push(j); }
    }
  }
  const area = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (n > area * 0.94) console.warn(`  ! (${at}) filled ${(100 * n / area).toFixed(0)}% of its box — the flood never got in`);
  return out;
}

const fig = regionIn(FIG);
const skin = new Uint8Array(N);
for (const p of SKIN_PARTS) { const r = regionIn(p); for (let i = 0; i < N; i++) if (r[i] && fig[i]) skin[i] = 1; }

// ── 4. his contour: a pen line on the silhouette, breathing ───────────────────────────────────
// The drawing implies this line and only half draws it: his white robe meets a pale floor and the
// figure dissolves into the boards. So the silhouette gets a stroke of its own — an unsigned
// distance to the mask's boundary (a chamfer, two sweeps), then the line laid across it, its
// half-width wandering on a slow noise so it is a pen stroke and not an offset path. The boundary
// is taken THREE PIXELS IN, because the region includes the outline the user already drew: laid on
// the outer edge it would thicken his silhouette outward; laid inside it, it lands on the existing
// line and only shows where there was none.
const dist = new Float32Array(N).fill(1e9);
{
  const inner = erode(fig, 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    const b = inner[i] && ((x > 0 && !inner[i - 1]) || (x < W - 1 && !inner[i + 1]) || (y > 0 && !inner[i - W]) || (y < H - 1 && !inner[i + W]));
    if (b) dist[i] = 0;
  }
  const D1 = 1, D2 = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y); let d = dist[i];
    if (y > 0) { d = Math.min(d, dist[i - W] + D1); if (x > 0) d = Math.min(d, dist[i - W - 1] + D2); if (x < W - 1) d = Math.min(d, dist[i - W + 1] + D2); }
    if (x > 0) d = Math.min(d, dist[i - 1] + D1);
    dist[i] = d;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = idx(x, y); let d = dist[i];
    if (y < H - 1) { d = Math.min(d, dist[i + W] + D1); if (x > 0) d = Math.min(d, dist[i + W - 1] + D2); if (x < W - 1) d = Math.min(d, dist[i + W + 1] + D2); }
    if (x < W - 1) d = Math.min(d, dist[i + 1] + D1);
    dist[i] = d;
  }
}
for (let y = FIG.y0 - 8; y <= FIG.y1 + 8; y++) for (let x = FIG.x0 - 8; x <= FIG.x1 + 8; x++) {
  const i = idx(x, y);
  if (dist[i] > 6) continue;
  const hw = 1.55 + 0.55 * vnoise(x / 47, y / 47) + 0.22 * vnoise(x / 13 + 9, y / 13 + 9);
  cov[i] = Math.max(cov[i], ss(hw + 0.7, hw - 0.7, dist[i]));
}

// ── 5. the title ──────────────────────────────────────────────────────────────────────────────
const title = new Float32Array(N);
for (let y = TITLE.y0; y <= TITLE.y1; y++) for (let x = TITLE.x0; x <= TITLE.x1; x++) {
  const i = idx(x, y);
  title[i] = ss(TITLE.lo, TITLE.hi, lum[i]);
}

// ── 6. print it ───────────────────────────────────────────────────────────────────────────────
function print(variant) {
  const out = Buffer.alloc(N * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), o = i * 4;
    let c = cov[i];
    // THE ONLY COLOUR ON THE PLATE. Flat, from the part, at the puppet's own values — the drawing's
    // shading inside his skin is thrown away, because a fill that fades is the wash the rules
    // forbid; where the light falls on him the pen states it, as hatching, or not at all. The one
    // thing the pixel is asked is whether it has any colour at all, which is how the whites of his
    // eyes stay paper inside a green head.
    let fill = PAPER;
    if (skin[i]) {
      const r = src[o], g = src[o + 1], b = src[o + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (sat > 30) fill = r > g + 14 ? LIPS : SKIN;
    }
    if (variant === 'ink') {
      c = Math.max(c, title[i]);
    } else {
      // the tablet: a filled ink field with a paper keyline, the letters knocked out of it
      const dx = Math.max(TABLET.x0 - x, x - TABLET.x1), dy = Math.max(TABLET.y0 - y, y - TABLET.y1);
      const d = dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
      const wob = 1.6 * (vnoise(x / 33, y / 33) - 0.5) + 0.8 * (vnoise(x / 9 + 4, y / 9 + 4) - 0.5);
      const inside = ss(0.9, -0.9, d + wob);                        // the slab
      const rule = ss(0.9, -0.9, Math.abs(d + 9 + wob) - 1.1);      // one paper rule inside its edge
      c = Math.max(c, Math.max(0, inside - Math.max(title[i], rule)));
      if (inside > 0.5 && (title[i] > 0.5 || rule > 0.5)) c = Math.min(c, 1 - Math.max(title[i], rule));
    }
    for (let k = 0; k < 3; k++) out[o + k] = Math.round(fill[k] + (INK[k] - fill[k]) * clamp01(c));
    out[o + 3] = 255;
  }
  return out;
}

for (const v of ['ink', 'panel']) {
  const buf = print(v);
  const file = OUT + (v === 'ink' ? 'tarotpepe-back-ink.png' : 'tarotpepe-back-panel.png');
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
  console.log('wrote', file.split('/').pop());
}

if (DEBUG) {
  const m = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) { const o = i * 4; m[o] = fig[i] ? 255 : 0; m[o + 1] = Math.round(cov[i] * 255); m[o + 2] = skin[i] ? 255 : Math.round(title[i] * 255); m[o + 3] = 255; }
  await sharp(m, { raw: { width: W, height: H, channels: 4 } }).png().toFile(HERE + '_backplate-masks.png');
  console.log('wrote tools/_backplate-masks.png (R = figure, G = ink coverage, B = skin + title)');
}
let inked = 0, mid = 0;
for (let i = 0; i < N; i++) { if (cov[i] > 0.92) inked++; else if (cov[i] > 0.12) mid++; }
console.log(`ink ${(100 * inked / N).toFixed(1)}% of the plate · edges ${(100 * mid / N).toFixed(1)}% · figure ${(100 * fig.reduce((a, b) => a + b, 0) / N).toFixed(1)}%`);
