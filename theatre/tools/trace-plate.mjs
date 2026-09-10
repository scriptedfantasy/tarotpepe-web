#!/usr/bin/env node
// trace-plate — THE MEME, PUT THROUGH THE ROOM'S PEN. Not redrawn: traced.
//
// The user, on round 2's hand-drawn crossroads: "the meme doesnt work if you redraw it, it only
// works as an original. maybe you can just trace the outlines of the actual meme with our ink rather
// than trying to redraw it?" He is right, and it is the same right he was right about with the card
// back and with his hands: a drawing of somebody else's drawing is a copy with the joke taken out.
// What this film does with somebody else's picture is put a pen through it.
//
//   node tools/trace-plate.mjs public/reference/crossroads.png public/reference/crossroads-ink.png
//
// THE SOURCE IS NEVER TOUCHED. It is read; one PNG and one small module of numbers come out.
//
// THIS IS THE SAME MILL as tools/back-plate.mjs and tools/hand-cutout.mjs, in the same order and for
// the same reasons, and every step of it is a THRESHOLD and never a fade (BRIEF: a mark is ink or it
// is paper; the one value allowed between them is the half pixel at a stroke's own edge).
//
//   1. THE PAGE IS PRINTED AT THE SHEET'S SIZE FIRST and everything after is measured in sheet
//      pixels. Keying a picture and then resizing it is what turned hand-pinch.png into a rectangle
//      on the first cut. The sheet takes the SOURCE'S OWN SHAPE — 416 x 416 in, 1800 x 1800 out —
//      because the crossroads shot was rebuilt this round to hold whatever shape the picture is
//      (src/pieces/egg-cross-plate.js: the lens now CONTAINS the picture on a field of paper instead
//      of being covered by it) and a crop of this meme is a meme with its feet cut off.
//
//   2. THE OUTLINES ARE FOUND, and which pass is right depends on what the picture is made of:
//
//        --edges ink     (the default) THE PICTURE'S OWN LINE. This meme is flat vector art: every
//                        shape already carries a black contour, and the only honest trace of a
//                        drawing that has a line in it is THAT line. Found the way back-plate.mjs
//                        finds a mullion — a local rule, not a global threshold — with one change
//                        that this picture forces: the threshold is anchored to the neighbourhood's
//                        DARK core rather than to its midpoint. Half of this drawing is a night sky
//                        at luminance 22 with black outlines at 5 running through it; a midpoint
//                        threshold floods the whole storm quadrant solid. Anchored low it takes the
//                        line at 5 and leaves the sky at 22, and it still takes a mullion off white
//                        paper, because there the same rule lands at 70 with the field at 130.
//        --edges canny   a blur, a Sobel, non-maximum suppression, a hysteresis threshold. Right for
//                        a picture with no line of its own — a photograph, a painting. On this one
//                        it draws BOTH sides of every black contour and the picture comes out
//                        double-struck.
//        --edges trace   imagetracerjs: the picture quantised into flat colour layers, their
//                        contours struck as lines. Closed and clean where a Canny is dotted; also
//                        double on a drawing whose lines are shapes of their own.
//        --edges ink+canny   the first, with the second's findings added wherever the picture has a
//                        boundary the artist did not outline.
//
//   3. THE NOISE IS DROPPED. Any island of edge smaller than `--min` pixels is not a line somebody
//      drew; it is the scan, the jpeg or a rock's speckle.
//
//   4. AND THE PEN IS RE-CUT ABOUT ITS OWN CENTRE LINE to the weight the room draws at — the move
//      hand-cutout.mjs makes on the user's hands, and the whole reason a cut drawing carries the
//      same line as the drawings beside it instead of a resampled one. The distance INSIDE the
//      picture's own mark, a sliding maximum of it for the mark's local half-width, and the two
//      together give the distance from the mark's CENTRE; the new stroke is laid across that at the
//      room's own nib. So a contour the artist drew fat comes out at our weight, a contour they drew
//      fine comes out at our weight, and neither is moved a pixel from where they put it. The half
//      width breathes on a slow noise and the centre wanders on another, because a line that does
//      neither is an offset path and reads as one.
//
//   5. THE TONE IS HATCHED, never washed. Where the original is dark the sheet gets parallel pen
//      strokes at the room's angle, broken along their length; where it is darker still, a second
//      pass across them. On this picture that is exactly the storm side — the night sky at 22, the
//      crag at 29, the dark castle at 38 — while the grass at 130, the road at 209 and the sun-lit
//      hill stay paper. The threshold does it; nobody tells it which side is which.
//
//   6. AND ONE PLATE OF COLOUR: the fire's yellow #f2b829 (egg-fine.js; the room has carried that
//      yellow since the user asked for it), laid on the original's own yellow. A KEY and not a disc,
//      because the sun in this picture is a starburst with a castle standing in front of it and no
//      disc would fit it. back-plate.mjs flattens the user's greens to the puppet's green the same
//      way: the pixel is asked what colour it is, and the answer is one flat fill or paper.
//
// AND IT MEASURES THE PICTURE ON ITS WAY PAST. The two roads at the door are switches on the two
// halves of the ground (src/pieces/egg-cross.js), and where the ground starts and where it forks are
// facts about whatever picture is on the sheet. Both are found here — the horizon as the row with
// the most horizontal edge in it, the fork as the row where one road becomes two — and written into
// src/pieces/egg-cross-land.js, which that piece imports. Override either with --hz / --fork.
//
// Every number below can be moved from the command line; --debug DIR writes the masks out to look at.
import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// ---- the flags --------------------------------------------------------------------------------
const argv = process.argv.slice(2);
function opt(name, dflt) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v == null || v.startsWith('--') ? true : v;
}
const num = (name, dflt) => {
  const v = opt(name, null);
  return v == null || v === true ? dflt : Number(v);
};
const files = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const v = argv[i + 1];
    if (v != null && !v.startsWith('--')) i++;
    continue;
  }
  files.push(a);
}
const SRC = files[0] ? resolve(process.cwd(), files[0]) : resolve(ROOT, 'public/reference/crossroads.png');
const OUT = files[1] ? resolve(process.cwd(), files[1]) : resolve(ROOT, 'public/reference/crossroads-ink.png');

// THE SHEET. 1800 px across, and as tall as the picture's own shape makes it. The plate stands 6.28 m
// out and the widest frame the film is shown in gives the picture about 1080 px of glass, so 1800 is
// two thirds again as many pixels as it can ever need — which is the margin the nib below is
// measured against and the reason a diagonal on this sheet is not a staircase.
const W = Math.round(num('width', 1800));
const FIT = String(opt('fit', 'native')); // native · cover · contain
const FOCUS = String(opt('focus', '0.5,0.5')).split(',').map(Number);

// THE NIB, IN SHEET PIXELS. The room's own contour on the back wall is 3.2 px on a 1920-wide frame
// and every drawing in this egg is struck one notch under it, at 2.9 px OF GLASS (egg-cross.js says
// why at length). The picture is 1080 px of glass printed from 1800 px of sheet — a sixty-seven per
// cent oversample — so 2.9 px of glass is 4.83 px of sheet. That is the whole derivation and it is
// the only reason this number is not the same as round 2's.
const PEN = num('pen', 4.83);
const PEN_WOBBLE = num('wobble', 0.16); // how far the line wanders off its own centre, in nibs
const EDGES = String(opt('edges', 'ink'));
const BLUR = num('blur', 1.4);
const HI = num('hi', 42);
const LO = num('lo', 15);
// the local rule for the picture's own line (step 2, --edges ink)
const CON_MIN = num('con', 30); // a flat field has no contrast and is never inked
const DARKSIDE = num('bias', 0.3); // how far off the neighbourhood's dark core the threshold sits
const T_ABS = num('cap', 150); // …and nothing lighter than this is ever a line, whatever the rule says
const MIN_RUN = Math.round(num('min', 30));
// the tone. Measured off this picture: the storm sky is 22, the crag 29, the dark castle 38, the
// storm's cloud 49; the grass is 130, the castle's stone 170, the road 209, the sky 215.
const TONE = num('tone', 100);
const DARKER = num('darker', 46);
const HATCH = num('hatch', 22); // the spacing of the strokes, sheet px (about 13 px of glass)
const HATCH_A = (num('angle', 34) * Math.PI) / 180;
const CROSS_K = num('crossk', 1.7); // the second pass is laid WIDER than the first, or the two make a mesh
// AND THE LIGHTNING IS NOT TONE. The bolt in this picture is a violet stroke at luminance 49, which
// is inside the dark mask and would be hatched flat with the sky it is drawn on — the one mark in
// the storm that has to read as LIGHT. It is keyed by its own colour, the way the sun is, and left
// as bare paper inside its outline: which is what egg-cross-draw.js's own strike sheet does, and
// what the film does with a light source on a dark ground.
const BOLT_B = num('boltb', 55); // how far the blue has to stand over the other two to be the bolt
// the colour key: bright, and warm by this much. Measured off this picture: the road is 209 with
// r−b 51 and must stay paper; the sun's glow is 235 with r−b 42 and its core 235 with 90.
const SUN_LUM = num('sunlum', 224);
const SUN_RB = num('sunrb', 40);
const SUN_GB = num('sungb', 26);
const NO_SUN = String(opt('sun', 'key')) === 'none';
const HZ_OPT = opt('hz', null);
const FORK_OPT = opt('fork', null);
const DEBUG = opt('debug', null);
const WRITE_LAND = !argv.includes('--no-land');
const LAND_FILE = resolve(ROOT, 'src/pieces/egg-cross-land.js');

// the world's two colours (src/core/strokes.js) and the room's one spare (egg-cross-draw.js SUN_Y)
const INK = [13, 14, 13];
const PAPER = [248, 249, 244];
const SUN_Y = [242, 184, 41];

if (!existsSync(SRC)) {
  console.error(`\n  the original is not here yet: ${SRC}`);
  console.error('  (nothing else in this tool needs it; run it again when it lands.)\n');
  process.exit(3);
}

// ---- the hand, borrowed ------------------------------------------------------------------------
// back-plate.mjs's value noise, verbatim, and for its reason: it is what makes a re-cut line breathe
// instead of reading as an offset path.
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const hash2 = (x, y) => {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const ab = a + (b - a) * u, cd = c + (d - c) * u;
  return ab + (cd - ab) * v;
}

// ---- 1. the page, printed at the sheet's size --------------------------------------------------
const meta = await sharp(SRC).metadata();
const srcAspect = meta.width / meta.height;
const H = Math.round(FIT === 'native' ? W / srcAspect : num('height', 1566));
const N = W * H;
const idx = (x, y) => y * W + x;
const gravity = (() => {
  const [u, v] = FOCUS;
  const h = u < 0.4 ? 'west' : u > 0.6 ? 'east' : '';
  const t = v < 0.4 ? 'north' : v > 0.6 ? 'south' : '';
  return t + h || 'centre';
})();
const { data: src } = await sharp(SRC)
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .resize(W, H, {
    fit: FIT === 'contain' ? 'contain' : FIT === 'cover' ? 'cover' : 'fill',
    position: FIT === 'cover' ? gravity : 'centre',
    background: { r: 255, g: 255, b: 255 },
    kernel: 'lanczos3',
  })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
console.log(`page   ${SRC.replace(ROOT + '/', '')}  ${meta.width}x${meta.height} (${srcAspect.toFixed(3)}:1)  →  ${W}x${H} by ${FIT}`);

const lum = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const o = i * 3;
  lum[i] = 0.299 * src[o] + 0.587 * src[o + 1] + 0.114 * src[o + 2];
}

// ---- separable helpers --------------------------------------------------------------------------
function blur(a, r) {
  if (r <= 0) return a;
  const R = Math.max(1, Math.ceil(r * 2.5));
  const k = new Float32Array(2 * R + 1);
  let s = 0;
  for (let i = -R; i <= R; i++) {
    k[i + R] = Math.exp(-(i * i) / (2 * r * r));
    s += k[i + R];
  }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const t = new Float32Array(N), o = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let i = -R; i <= R; i++) v += k[i + R] * a[idx(Math.min(W - 1, Math.max(0, x + i)), y)];
      t[idx(x, y)] = v;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let i = -R; i <= R; i++) v += k[i + R] * t[idx(x, Math.min(H - 1, Math.max(0, y + i)))];
      o[idx(x, y)] = v;
    }
  return o;
}
// back-plate.mjs's separable box min / max over a nib
function boxExtreme(a, r, cmp) {
  const t = new Float32Array(N), o = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = a[idx(x, y)];
      for (let k = -r; k <= r; k++) {
        const v = a[idx(Math.min(W - 1, Math.max(0, x + k)), y)];
        if (cmp(v, m)) m = v;
      }
      t[idx(x, y)] = m;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = t[idx(x, y)];
      for (let k = -r; k <= r; k++) {
        const v = t[idx(x, Math.min(H - 1, Math.max(0, y + k)))];
        if (cmp(v, m)) m = v;
      }
      o[idx(x, y)] = m;
    }
  return o;
}
// hand-cutout.mjs's chamfer distance transform: how far every 1 is from the nearest 0. `oob` is what
// lies off the edge of the sheet, and it is not one answer for both directions — measuring DEPTH
// inside a mark the sheet's edge cuts it (0); measuring how far a pixel is FROM a mark it does not
// (1e6), or the whole margin reads as "just outside the drawing".
function distOf(mask, oob = 0) {
  const d = new Float32Array(N);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? oob : d[x + y * W]);
  for (let i = 0; i < N; i++) d[i] = mask[i] ? 1e6 : 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = x + y * W;
      if (!d[k]) continue;
      d[k] = Math.min(d[k], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const k = x + y * W;
      if (!d[k]) continue;
      d[k] = Math.min(d[k], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  return d;
}
// hand-cutout.mjs's sliding maximum: for every pixel, the deepest point of the mark it is inside —
// which is that mark's own half-width, and the number the re-cut needs
function maxOf(a, r) {
  const t = new Float32Array(N), o = new Float32Array(N);
  const run = (get, set, n) => {
    const q = new Int32Array(n);
    let h = 0, tl = 0;
    for (let i = 0; i < n; i++) {
      while (tl > h && get(q[tl - 1]) <= get(i)) tl--;
      q[tl++] = i;
      if (q[h] < i - 2 * r) h++;
      if (i >= r) set(i - r, get(q[h]));
    }
    for (let i = n; i < n + r; i++) {
      if (q[h] < i - 2 * r) h++;
      set(i - r, get(q[h]));
    }
  };
  for (let y = 0; y < H; y++) run((i) => a[y * W + i], (i, v) => (t[y * W + i] = v), W);
  for (let x = 0; x < W; x++) run((i) => t[i * W + x], (i, v) => (o[i * W + x] = v), H);
  return o;
}
function erode(m, r) {
  const t = new Uint8Array(N), o = new Uint8Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 1;
      for (let k = -r; k <= r && v; k++) v = m[idx(Math.min(W - 1, Math.max(0, x + k)), y)] ? v : 0;
      t[idx(x, y)] = v;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 1;
      for (let k = -r; k <= r && v; k++) v = t[idx(x, Math.min(H - 1, Math.max(0, y + k)))] ? v : 0;
      o[idx(x, y)] = v;
    }
  return o;
}

// ---- 2. THE OUTLINES ----------------------------------------------------------------------------
const smooth = blur(lum, 2.0);
// the Sobel, which two of the three passes want and the horizon measurement wants whatever happens
const g0 = blur(lum, BLUR);
const gx = new Float32Array(N), gy = new Float32Array(N), mag = new Float32Array(N);
for (let y = 1; y < H - 1; y++)
  for (let x = 1; x < W - 1; x++) {
    const i = idx(x, y);
    const a = g0[i - W - 1], b = g0[i - W], c = g0[i - W + 1];
    const d = g0[i - 1], f = g0[i + 1];
    const g = g0[i + W - 1], h = g0[i + W], k = g0[i + W + 1];
    gx[i] = a + 2 * d + g - (c + 2 * f + k);
    gy[i] = a + 2 * b + c - (g + 2 * h + k);
    mag[i] = Math.hypot(gx[i], gy[i]) / 4;
  }

// (a) THE PICTURE'S OWN LINE. A pixel is a line if its neighbourhood has a mark in it at all
// (contrast) and it sits within a fraction of that contrast of the neighbourhood's DARK core. The
// nib's reach is the picture's own line weight and a little: at 1800 px this drawing's contours run
// eight to twelve pixels, so a box of seven each way always holds both a line and its field.
function ownLine() {
  const R = Math.max(3, Math.round(PEN * 1.6));
  const lo = boxExtreme(lum, R, (v, m) => v < m);
  const hi = boxExtreme(lum, R, (v, m) => v > m);
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const con = hi[i] - lo[i];
    if (con < CON_MIN) continue;
    const t = Math.min(lo[i] + con * DARKSIDE, T_ABS);
    if (lum[i] <= t) out[i] = 1;
  }
  return out;
}
function canny() {
  const thin = new Float32Array(N);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y), m = mag[i];
      if (m < LO) continue;
      const a = Math.atan2(gy[i], gx[i]);
      const s = ((Math.round((a * 4) / Math.PI) % 4) + 4) % 4;
      const [dx, dy] = s === 0 ? [1, 0] : s === 1 ? [1, 1] : s === 2 ? [0, 1] : [-1, 1];
      if (m >= mag[idx(x + dx, y + dy)] && m >= mag[idx(x - dx, y - dy)]) thin[i] = m;
    }
  const out = new Uint8Array(N), st = [];
  for (let i = 0; i < N; i++)
    if (thin[i] >= HI) {
      out[i] = 1;
      st.push(i);
    }
  while (st.length) {
    const i = st.pop(), x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = idx(nx, ny);
        if (!out[j] && thin[j] >= LO) {
          out[j] = 1;
          st.push(j);
        }
      }
  }
  return out;
}
// (c) imagetracerjs. The picture quantised into flat colour layers, every layer's contour struck as
// a line — the curves WALKED and not chorded, so the mask carries the shape and not its corners.
async function traced() {
  const { default: ImageTracer } = await import('imagetracerjs');
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    rgba[i * 4] = src[i * 3];
    rgba[i * 4 + 1] = src[i * 3 + 1];
    rgba[i * 4 + 2] = src[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  const td = ImageTracer.imagedataToTracedata({ width: W, height: H, data: rgba }, {
    numberofcolors: Math.round(num('colors', 10)),
    colorquantcycles: 3,
    pathomit: MIN_RUN,
    ltres: 1,
    qtres: 1,
    rightangleenhance: false,
    blurradius: Math.round(BLUR),
    blurdelta: 20,
  });
  const out = new Uint8Array(N);
  const put = (x, y) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi >= 0 && yi >= 0 && xi < W && yi < H) out[idx(xi, yi)] = 1;
  };
  const line = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  };
  let paths = 0;
  for (const layer of td.layers)
    for (const p of layer) {
      if (!p.segments?.length) continue;
      paths++;
      let px = p.segments[0].x1, py = p.segments[0].y1;
      for (const s of p.segments) {
        if (s.type === 'Q') {
          const n = Math.max(2, Math.ceil((Math.hypot(s.x2 - s.x1, s.y2 - s.y1) + Math.hypot(s.x3 - s.x2, s.y3 - s.y2)) / 2));
          for (let i = 1; i <= n; i++) {
            const t = i / n, m = 1 - t;
            const x = m * m * s.x1 + 2 * m * t * s.x2 + t * t * s.x3;
            const y = m * m * s.y1 + 2 * m * t * s.y2 + t * t * s.y3;
            line(px, py, x, y);
            px = x;
            py = y;
          }
        } else {
          line(px, py, s.x2, s.y2);
          px = s.x2;
          py = s.y2;
        }
      }
    }
  console.log(`edges  imagetracerjs: ${td.layers.length} layers, ${paths} contours`);
  return out;
}

let edge;
if (EDGES.startsWith('trace')) edge = await traced();
else if (EDGES === 'canny') edge = canny();
else {
  edge = ownLine();
  if (EDGES.includes('canny')) {
    const c = canny();
    // …only where the artist drew NO line: a Canny finding inside a nib of the picture's own contour
    // is that contour's other side, and taking it doubles every stroke in the drawing
    const near = distOf(new Uint8Array(N).map((_, i) => (edge[i] ? 0 : 1)), 1e6);
    let added = 0;
    for (let i = 0; i < N; i++)
      if (c[i] && !edge[i] && near[i] > PEN * 1.6) {
        edge[i] = 1;
        added++;
      }
    console.log(`edges  a Canny added ${added} px where the picture had no line of its own`);
  }
}

// ---- 3. THE NOISE IS DROPPED -------------------------------------------------------------------
{
  const lab = new Int32Array(N).fill(-1);
  const sizes = [];
  for (let s = 0; s < N; s++) {
    if (!edge[s] || lab[s] >= 0) continue;
    const id = sizes.length;
    const st = [s];
    lab[s] = id;
    let n = 0;
    while (st.length) {
      const i = st.pop();
      n++;
      const x = i % W, y = (i - x) / W;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = idx(nx, ny);
          if (edge[j] && lab[j] < 0) {
            lab[j] = id;
            st.push(j);
          }
        }
    }
    sizes.push(n);
  }
  let kept = 0, dropped = 0;
  const clean = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!edge[i]) continue;
    if (sizes[lab[i]] >= MIN_RUN) {
      clean[i] = 1;
      kept++;
    } else dropped++;
  }
  console.log(`edges  ${EDGES}: ${sizes.length} islands, ${kept} px kept (${((100 * kept) / N).toFixed(1)}% of the sheet), ${dropped} dropped as noise (< ${MIN_RUN} px)`);
  edge = clean;
}

// ---- 4. THE PEN, RE-CUT ABOUT ITS OWN CENTRE LINE ----------------------------------------------
// hand-cutout.mjs's move. `dIn` is how deep a pixel is inside the picture's own mark; `R`, the
// sliding maximum of it, is that mark's half-width where it is thickest nearby; so `R − t` is the
// distance from the mark's CENTRE LINE, positive outwards, whether the pixel is in the mark or
// beside it. The new stroke is laid across that at our own half-width — which thins a fat contour
// and fattens a fine one WITHOUT MOVING EITHER, because the centre line is untouched.
const cov = new Float32Array(N);
let offLine = null; // how far every pixel is from the nearest mark: the hatch needs it too
{
  const notEdge = new Uint8Array(N);
  for (let i = 0; i < N; i++) notEdge[i] = edge[i] ? 0 : 1;
  const dIn = distOf(edge);
  const dOut = distOf(notEdge, 1e6);
  offLine = dOut;
  // the picture's own line weight, as the median depth of the marks it drew: what is being re-cut
  const depths = [];
  for (let i = 0; i < N; i += 7) if (edge[i] && dIn[i] > 0) depths.push(dIn[i]);
  depths.sort((a, b) => a - b);
  const drawn = depths.length ? depths[Math.floor(depths.length * 0.75)] * 2 : PEN;
  const R = maxOf(dIn, Math.max(1, Math.ceil(drawn * 0.85)));
  const half = PEN / 2;
  const reach = drawn + PEN + 3;
  let n = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const t = edge[i] ? dIn[i] : -dOut[i];
      if (-t > reach) continue;
      const c = (R[i] > 0 ? R[i] : drawn / 2) - t;
      const hw = half * (0.84 + 0.32 * vnoise(x / 13 + 7, y / 13 + 7)) + (vnoise(x / 37, y / 37) - 0.5) * 2 * PEN_WOBBLE * PEN;
      const a = ss(hw + 0.7, hw - 0.7, c);
      if (a > 0) {
        cov[i] = a;
        if (a > 0.5) n++;
      }
    }
  console.log(`pen    the picture's own line runs ${drawn.toFixed(1)} px on this sheet; re-cut about its centre to ${PEN} (${((100 * n) / N).toFixed(1)}% of the sheet is stroke)`);
}

// ---- 5. THE TONE, HATCHED ----------------------------------------------------------------------
// The mask is ERODED by a nib before it is filled, so the hatch stops short of the outline instead
// of fattening it, and each stroke is broken along its length on a slow noise, the way strokes.js
// breaks a hatch.
const toneRaw = new Uint8Array(N), darkRaw = new Uint8Array(N), bolt = new Uint8Array(N);
let boltN = 0;
for (let i = 0; i < N; i++) {
  const o = i * 3;
  if (src[o + 2] - Math.max(src[o], src[o + 1]) >= BOLT_B) {
    bolt[i] = 1;
    boltN++;
  }
}
// the bolt, grown by a nib so the strokes stop clear of its outline rather than on it
const boltNear = distOf(new Uint8Array(N).map((_, i) => (bolt[i] ? 0 : 1)), 1e6);
for (let i = 0; i < N; i++) {
  const lit = boltNear[i] <= PEN * 1.2;
  toneRaw[i] = smooth[i] < TONE && !lit ? 1 : 0;
  darkRaw[i] = smooth[i] < DARKER && !lit ? 1 : 0;
}
console.log(`bolt   ${((100 * boltN) / N).toFixed(2)}% of the sheet is the lightning's own violet: left as bare paper inside its line`);
const tone = erode(toneRaw, Math.max(1, Math.round(PEN * 0.5)));
const dark = erode(darkRaw, Math.max(1, Math.round(PEN * 0.7)));
function stripes(x, y, angle, spacing, phase) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const across = (x * s - y * c) / spacing + (vnoise(x / 41 + phase, y / 41 + phase) - 0.5) * 0.5;
  const f = Math.abs(across - Math.round(across)) * spacing;
  const along = vnoise((x * c + y * s) / 30 + phase * 3, (x * s - y * c) / 3.2 + phase * 3);
  if (along < 0.26) return 0;
  const hw = PEN * 0.34 * (0.8 + 0.4 * vnoise(x / 9 + phase, y / 9 + phase));
  return ss(hw + 0.6, hw - 0.6, f);
}
// A HAND HATCHES BETWEEN THE LINES, AND THIS IS THE WHOLE DIFFERENCE between tone and a stain. The
// first cut ran one continuous comb of strokes across the entire storm quadrant, straight over the
// dark castle's own windows and the crag's fissures, and at 1:1 the castle was gone. Two rules put
// it back, and both are things a person does with a pen without thinking about it:
//   · NOTHING IS HATCHED WITHIN A NIB AND A HALF OF A LINE. Every stroke of the drawing keeps a
//     halo of bare paper, so the drawing reads THROUGH the tone instead of under it.
//   · AND NOTHING IS HATCHED WHERE THE DRAWING IS ALREADY DENSE. Where the picture put a lot of
//     line into a small space — the castle's face, the crag's cracks — the LINE is the tone, and a
//     comb over the top of it is a second drawing on the same paper. Measured as the fraction of a
//     three-nib neighbourhood that is mark, and faded out rather than switched, so the tone thins
//     as the drawing thickens.
const density = (() => {
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) m[i] = edge[i] ? 1 : 0;
  return blur(m, PEN * 2.4);
})();
const HALO = PEN * 1.5;
const DENSE = num('dense', 0.42);
let toneN = 0, darkN = 0, shy = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (!tone[i]) continue;
    toneN++;
    if (offLine[i] < HALO) {
      shy++;
      continue;
    }
    const room = 1 - ss(DENSE * 0.55, DENSE, density[i]);
    if (room <= 0.02) {
      shy++;
      continue;
    }
    let c = stripes(x, y, HATCH_A, HATCH, 0);
    if (dark[i]) {
      darkN++;
      c = Math.max(c, stripes(x, y, HATCH_A + Math.PI / 2, HATCH * CROSS_K, 5.5));
    }
    c *= room;
    if (c > cov[i]) cov[i] = c;
  }
console.log(`hatch  ${((100 * shy) / Math.max(1, toneN)).toFixed(0)}% of the dark is left bare: the halo round every line, and where the drawing is already its own tone`);
console.log(`tone   ${((100 * toneN) / N).toFixed(1)}% of the sheet is dark enough for hatch (under ${TONE}), ${((100 * darkN) / N).toFixed(1)}% for a second pass across it (under ${DARKER})`);

// ---- 6. THE ONE PLATE OF COLOUR ----------------------------------------------------------------
const sunMask = new Uint8Array(N);
let colourN = 0;
if (!NO_SUN) {
  for (let i = 0; i < N; i++) {
    const o = i * 3, r = src[o], g = src[o + 1], b = src[o + 2];
    if (lum[i] >= SUN_LUM && r - b >= SUN_RB && g - b >= SUN_GB) {
      sunMask[i] = 1;
      colourN++;
    }
  }
  // THE KEY IS OPENED BEFORE IT IS CLOSED, and both halves are load-bearing. OPENED — eroded, then
  // grown back — because a page resized four times up has an anti-aliased fringe at every boundary,
  // and a strip of it two pixels wide between the boy's arm and his sleeve passes any colour test
  // you can write: the first cut printed him with yellow down both arms and yellow socks. Nothing
  // narrower than a nib is a plate of colour. CLOSED after it, because the sun in this picture is a
  // starburst crossed by a castle and the key comes back as a dozen wedges that have to read as one
  // sheet of colour. The ink is then laid ON TOP of the fill, which is what a colour plate is.
  const grow = (m, r) => {
    const d = distOf(new Uint8Array(N).map((_, i) => (m[i] ? 0 : 1)), 1e6);
    const o = new Uint8Array(N);
    for (let i = 0; i < N; i++) o[i] = d[i] <= r ? 1 : 0;
    return o;
  };
  const opened = grow(erode(sunMask, Math.max(1, Math.round(PEN * 0.7))), PEN * 0.7);
  const closed = erode(grow(opened, PEN * 1.6), Math.max(1, Math.round(PEN * 1.6)));
  // …and then the same rule the outlines get: A PLATE OF COLOUR IS A PLATE, not a fleck. The boy's
  // knee — a centimetre of bare leg between his shorts and his socks — is warm enough and bright
  // enough to pass any hue test, and it printed as two orange chips on his shins. Anything under a
  // thousandth of the sheet is not the sun.
  const MIN_PLATE = Math.round(N * num('minplate', 0.001));
  const lab = new Int32Array(N).fill(-1);
  const sizes = [];
  for (let s = 0; s < N; s++) {
    if (!closed[s] || lab[s] >= 0) continue;
    const id = sizes.length;
    const st = [s];
    lab[s] = id;
    let n = 0;
    while (st.length) {
      const i = st.pop();
      n++;
      const x = i % W, y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = idx(nx, ny);
        if (closed[j] && lab[j] < 0) {
          lab[j] = id;
          st.push(j);
        }
      }
    }
    sizes.push(n);
  }
  colourN = 0;
  let chips = 0;
  for (let i = 0; i < N; i++) {
    const keep = closed[i] && sizes[lab[i]] >= MIN_PLATE;
    sunMask[i] = keep ? 1 : 0;
    if (keep) colourN++;
    else if (closed[i]) chips++;
  }
  if (chips) console.log(`colour ${sizes.length} plates keyed, ${sizes.filter((n) => n >= MIN_PLATE).length} kept; ${chips} px of fleck dropped (under ${MIN_PLATE} px)`);
}
console.log(`colour ${((100 * colourN) / N).toFixed(2)}% of the sheet takes the fire's yellow${NO_SUN ? ' (asked for none)' : ''}`);

// ---- 7. WHERE THE GROUND STARTS AND WHERE IT FORKS ---------------------------------------------
//   THE HORIZON is the row with the most HORIZONTAL edge in it — a skyline, a ridge, the far side of
//   a field: long runs whose gradient points up and down. Looked for in the middle half of the
//   sheet, because the top of a picture is sky and the bottom is the road being stood on.
//   THE FORK is where one road becomes two. Below the horizon the road is the light ground; count
//   its runs on every row, walk UP from the foot of the sheet while there is one of them, and the
//   row where a second appears is the fork. Its column is the middle of the single run just under it.
function measure() {
  const rowH = new Float64Array(H);
  for (let y = 1; y < H - 1; y++) {
    let n = 0;
    for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y);
      if (edge[i] && Math.abs(gy[i]) > Math.abs(gx[i]) * 1.6) n++;
    }
    rowH[y] = n;
  }
  const sm = new Float64Array(H);
  const R = 5;
  for (let y = 0; y < H; y++) {
    let a = 0, c = 0;
    for (let k = -R; k <= R; k++) {
      const yy = y + k;
      if (yy < 0 || yy >= H) continue;
      a += rowH[yy];
      c++;
    }
    sm[y] = a / c;
  }
  let hzY = Math.round(H * 0.45), bestH = -1;
  for (let y = Math.round(H * 0.26); y < Math.round(H * 0.74); y++)
    if (sm[y] > bestH) {
      bestH = sm[y];
      hzY = y;
    }
  const roadT = num('roadlum', 170);
  const MINRUN = Math.round(W * 0.02);
  let forkY = null, forkX = null, below = null;
  const runsOn = (y) => {
    const runs = [];
    let s = -1;
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const road = smooth[i] > roadT && cov[i] < 0.5;
      if (road && s < 0) s = x;
      else if (!road && s >= 0) {
        if (x - s >= MINRUN) runs.push([s, x - 1]);
        s = -1;
      }
    }
    if (s >= 0 && W - s >= MINRUN) runs.push([s, W - 1]);
    return runs;
  };
  // WALKED DOWN FROM THE SKYLINE AND NOT UP FROM THE FOOT, which is a bug this picture taught. Up
  // from the foot, the first row with two runs in it is the row the CHILD is standing on: he is a
  // hundred pixels of ink in the middle of the road and he splits it in two exactly as a wedge of
  // grass does. Down from the skyline there are two roads all the way to the fork and one under it,
  // and the child is a long way below that. The fork is the first row that has ONE wide road in it,
  // held for three rows so a gap in a kerb cannot claim it.
  const WIDE = Math.round(W * 0.09);
  let ones = 0;
  for (let y = hzY + 2; y < H - 4; y += 2) {
    const r = runsOn(y);
    const one = r.length === 1 && r[0][1] - r[0][0] >= WIDE;
    if (!one) {
      ones = 0;
      continue;
    }
    if (++ones < 3) continue;
    forkY = y - 4;
    forkX = (r[0][0] + r[0][1]) / 2;
    below = r[0];
    break;
  }
  const hz = HZ_OPT != null && HZ_OPT !== true ? Number(HZ_OPT) : forkY != null ? forkY / H : hzY / H;
  const forkU = FORK_OPT != null && FORK_OPT !== true ? Number(FORK_OPT) : forkX != null ? forkX / W : 0.5;
  return {
    hz,
    fork: forkU,
    forkV: forkY != null ? forkY / H : null,
    skyline: hzY / H,
    how: {
      horizon: HZ_OPT != null && HZ_OPT !== true ? 'given' : forkY != null ? `the fork's own row, ${forkY} (the skyline, ${hzY}, is above the country and is not the ground)` : `the row with the most horizontal edge in it (${bestH.toFixed(0)} px on row ${hzY})`,
      fork: FORK_OPT != null && FORK_OPT !== true ? 'given' : forkY != null ? `one road becomes two on row ${forkY} (v ${(forkY / H).toFixed(3)}), the single road under it centred on x ${forkX?.toFixed(0)}` : "no split found in the ground — the sheet's own centre line stands",
    },
  };
}
const M = measure();
console.log(`ground the ground starts at v ${M.hz.toFixed(3)} — ${M.how.horizon}`);
console.log(`       the fork is at u ${M.fork.toFixed(3)} — ${M.how.fork}`);

// ---- 8. PRINT IT, ON A SHEET WITH A RULE ROUND IT -----------------------------------------------
// The picture stands on bare paper out there (src/pieces/egg-cross-plate.js: the lens holds the
// whole of it and paper fills the rest of the window), and this drawing runs dark right up to its
// own right-hand edge — the storm side is hatched to the last pixel. Against paper that edge reads
// as a cut, as though something had been pasted down. So the sheet is a little bigger than the
// picture and a PEN RULE is struck round it in the margin: it is then a plate on a page, which is
// what a picture in this film is, and the same wobble and the same nib as everything else on it.
const PAD = Math.max(0, Math.round(num('pad', 0.018) * W));
const RULE = !argv.includes('--no-border') && PAD > 0;
const OW = W + PAD * 2, OH = H + PAD * 2, ON = OW * OH;
const out = Buffer.alloc(ON * 4);
let inked = 0, edges = 0;
for (let y = 0; y < OH; y++)
  for (let x = 0; x < OW; x++) {
    const sx = x - PAD, sy = y - PAD;
    const inside = sx >= 0 && sy >= 0 && sx < W && sy < H;
    const i = inside ? idx(sx, sy) : -1;
    let c = inside ? clamp01(cov[i]) : 0;
    if (RULE) {
      // the rule sits in the middle of the margin, its distance thrown by the same slow noise the
      // strokes are, so it is a line somebody drew round a picture and not a border
      const dx = Math.min(x, OW - 1 - x), dy = Math.min(y, OH - 1 - y);
      const d = Math.min(dx, dy) - PAD * 0.5 + (vnoise(x / 29, y / 29) - 0.5) * PEN * 0.8;
      c = Math.max(c, ss(PEN * 0.5 + 0.7, PEN * 0.5 - 0.7, Math.abs(d)));
    }
    const fill = inside && sunMask[i] ? SUN_Y : PAPER;
    const o = (y * OW + x) * 4;
    for (let k = 0; k < 3; k++) out[o + k] = Math.round(fill[k] + (INK[k] - fill[k]) * c);
    out[o + 3] = 255;
    if (c > 0.92) inked++;
    else if (c > 0.12) edges++;
  }
mkdirSync(dirname(OUT), { recursive: true });
const info = await sharp(out, { raw: { width: OW, height: OH, channels: 4 } }).png({ compressionLevel: 9, effort: 8 }).toFile(OUT);
console.log(`plate  ${OUT.replace(ROOT + '/', '')}  ${OW}x${OH} (the picture ${W}x${H} with ${PAD} px of margin${RULE ? ' and a rule in it' : ''})  ${(info.size / 1024).toFixed(0)}KB`);
console.log(`ink    ${((100 * inked) / N).toFixed(1)}% of the sheet solid · ${((100 * edges) / N).toFixed(1)}% the half pixel at a stroke's edge`);

if (WRITE_LAND) {
  // every u and v is re-stated in the SHEET's coordinates, margin and all, because that is what the
  // piece maps onto the plane — not the picture's
  const U = (u) => +((PAD + u * W) / OW).toFixed(4);
  const V = (v) => +((PAD + v * H) / OH).toFixed(4);
  const land = {
    note: "WHERE THINGS ARE IN THE TRACED PICTURE, in the plate's own u,v (0..1 from its top-left corner). Written by tools/trace-plate.mjs and READ by src/pieces/egg-cross.js, so the two roads' switch boxes sit on the fork of the picture that is actually on the sheet.",
    source: SRC.replace(ROOT + '/', ''),
    when: new Date().toISOString().slice(0, 19) + 'Z',
    size: [OW, OH],
    picture: [W, H],
    pad: PAD,
    land: {
      hz: V(M.hz),
      fork: U(M.fork),
      apex: [U(M.fork), V(M.forkV ?? M.hz)],
      skyline: V(M.skyline),
      skyV: +(V(M.skyline) + 0.02).toFixed(4),
    },
    measured: M.how,
  };
  // WRITTEN AS A MODULE AND NOT AS A .json, for one reason and it is a plain one: node's own ESM
  // loader refuses a bare JSON import without an attribute Vite does not need, and a file two
  // different runtimes read has to be readable by both — the page imports it and the probes and
  // proofs in tools/ import it too. It is still nothing but the numbers.
  writeFileSync(LAND_FILE, '// WHERE THINGS ARE IN THE TRACED PICTURE. Written by tools/trace-plate.mjs; do not edit by hand.\nexport default ' + JSON.stringify(land, null, 2) + ';\n');
  console.log(`land   ${LAND_FILE.replace(ROOT + '/', '')} rewritten (--no-land to leave it)`);
}

if (typeof DEBUG === 'string') {
  mkdirSync(DEBUG, { recursive: true });
  const m = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    m[o] = edge[i] ? 255 : 0;
    m[o + 1] = tone[i] ? 200 : 0;
    m[o + 2] = sunMask[i] ? 255 : dark[i] ? 120 : 0;
    m[o + 3] = 255;
  }
  await sharp(m, { raw: { width: W, height: H, channels: 4 } }).png().toFile(DEBUG + '/trace-masks.png');
  console.log(`debug  ${DEBUG}/trace-masks.png  (R = the picture's own line, G = what gets hatch, B = the sun and the second pass)`);
}
