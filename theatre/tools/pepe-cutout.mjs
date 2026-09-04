#!/usr/bin/env node
// pepe-cutout — Tarot Pepe as a paper cut-out puppet. Turns the supplied drawing
// public/pepe/pepe-meditation.webp (474 x 454, RGBA) into print-resolution layers under
// public/pepe/cutout-<layer>.png plus a manifest public/pepe/cutout.json (pixel bounds, pivots,
// anchors, the occupied cells each layer's mesh is built from). Run once, commit the output:
//
//   node tools/pepe-cutout.mjs                      # writes the layers + manifest
//   node tools/pepe-cutout.mjs --preview /tmp/pc    # also writes preview sheets there
//   node tools/pepe-cutout.mjs --fill soft          # keep the drawing's airbrush shading
//   node tools/pepe-cutout.mjs --trace              # also rasterise an imagetracerjs trace (preview only)
//
// Method: a 4.32x lanczos upscale (+ a light unsharp mask) is the LINE layer — ink alpha from
// darkness, so the drawing's own pen stays confident and black. The FILLS under the lines are
// re-flattened to the drawing's palette (paper, three greens, the red of the lips, eye white): a
// cut-out printed from the drawing. imagetracerjs was tried for the fills (--trace); its paths go
// blobby at the eyes and the line work loses its taper, so it lost to the upscale.
//
// Layers (all in "hi" pixel space, W = 2048):
//   body      robe, legs, feet, the sleeves with their cuff lines; the collar band continues white
//             under the head so a lift or tilt of the head never shows a hole
//   head      from the chin line up; mouth and pupils removed (they are overlays)
//   handL/R   each hand with a green tab that runs on under the sleeve (the hands sit BEHIND the
//             body, hinged at the wrist, the way a paper theatre limb is tucked under)
//   pupilL/R  a pupil disc on a transparent field the size of the eye (moved by uv offset)
//   eyelines  the ink of the eye region, on top of the pupils (the heavy lids clip the pupil)
//   lidL/R    a closed lid: green over the eye white with a thick dark lower edge
//   mouthRest the drawing's own lips; mouthO a small open "o"; mouthFlat a thin closed mouth
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? (args[i + 1] ?? true) : null;
};
const PREVIEW = typeof opt('preview') === 'string' ? opt('preview') : null;
const FILL = opt('fill') ?? 'flat'; // flat | soft
const TRACE = args.includes('--trace');

const SRC = new URL('../public/pepe/pepe-meditation.webp', import.meta.url).pathname;
const OUT = new URL('../public/pepe/', import.meta.url).pathname;
const TARGET_W = 2048;
const CELL = 64; // hi px; the meshes are built from the occupied cells of this grid
const INK = [13, 14, 13]; // the world's ink #0d0e0d (src/core/strokes.js), and nothing else

// ── one pen (the numbers) ───────────────────────────────────────────────────────────────────────
// Measured on the supplied drawing (tools/_pepe-contour.mjs): its contour is 6 source pixels
// thick, its interior lines 5–7. In the pepe shot one source pixel is very nearly one screen
// pixel, and the room's pen is 2 screen pixels (ink-tiles.js: PEN = 2.0, and the outline pass at
// lineWeight 1.1). So the drawing is inked three times as heavy as the room it sits in — and
// because a `colorful` material shows its albedo verbatim (ink-shaders.js: `if (colorful) base =
// alb.rgb`), that fat, smooth, un-boiling marker line WAS his contour on screen: a second drawing
// pasted into the first. Two things are done about it below:
//   · every line of the drawing is re-cut to the room's weight about its own centre;
//   · the OUTER contour is taken off altogether and the alpha eroded to where its middle ran, so
//     the ink pass draws his silhouette itself, in its own hand, at the room's weight, with the
//     room's wobble and the room's boil (pepe.js asks for lineWeight 1.1).
// 2.7, not 2.3: at the judging shot one source pixel is 0.86 screen pixels, so 2.3 lands at the
// room's two — but a line baked in a texture is minified about five times to get there, and the
// mip chain turns a two-pixel line into a grey. Cut a third heavier and the core stays ink.
const PEN_W = 2.7; // source px: the width the drawing's pen is re-cut to
const CONTOUR_W = 6.0; // source px: what it is now, where it runs round the outside
// And the colour plate is printed a hair out of register under the line, the way the folios' fills
// sit off their contours (STYLE.md §1.4). The key is stage left, so the paper opens on that side.
const MISREG = [1.4, 1.6]; // source px, the colour pulled down and to the right

// ── source-pixel geometry (474 x 454), read off the drawing with tools/_pepe-grid.mjs ──
const GEO = {
  // the outer (lower) edge of the chin line, left → right, run past the head on both sides
  chin: [[100, 66], [152, 100], [158, 117], [164, 128], [172, 136], [180, 141], [197, 146], [213, 149], [230, 151], [247, 151], [263, 150], [280, 148], [290, 146], [297, 144], [303, 138], [308, 132], [313, 125], [322, 117], [327, 110], [331, 100], [340, 82], [400, 40]],
  collarX: [154, 336], // the collar is drawn between these columns
  // pepe.js cuts the head a little smaller than the drawing (a small head on a long body,
  // STYLE.md §1.6) about the neck, so the jaw lifts away from the chin line at the sides and the
  // robe has to meet it there. headScale MUST match HEAD_S in src/pieces/pepe.js: the robe's
  // neckline is drawn to follow the jaw it will actually have.
  headScale: 0.88,
  neck: [245, 150],
  headCentre: [245, 76],
  eyeL: { box: [201, 34, 268, 79], centre: [236, 57], pupil: { c: [240, 57.5], rx: 11.5, ry: 12.5, hi: [235.5, 51.5] } },
  eyeR: { box: [266, 34, 331, 79], centre: [299, 56], pupil: { c: [301, 56], rx: 10.5, ry: 11.5, hi: [297, 50.5] } },
  mouth: { box: [194, 86, 336, 134], centre: [265, 111] },
  // hands: poly = the hand plus 8 px of sleeve past the cuff; cuff = the cuff line top → bottom (x as a function of y)
  handL: { poly: [[0, 288], [56, 288], [64, 294], [82, 302], [88, 320], [90, 350], [86, 380], [76, 408], [0, 408]], cuff: [[52, 298], [62, 306], [70, 314], [75, 328], [78, 346], [80, 356]], wrist: [67, 322], side: -1 },
  handR: { poly: [[386, 264], [474, 264], [474, 384], [432, 384], [420, 350], [410, 335], [390, 306]], cuff: [[401, 278], [404, 300], [408, 313], [413, 323], [420, 334]], wrist: [407, 305], side: 1 },
};

// ── the drawing, upscaled ──
const meta = await sharp(SRC).metadata();
const SW = meta.width, SH = meta.height;
const K = TARGET_W / SW;
const W = TARGET_W, H = Math.round(SH * K);
const s = (v) => v * K; // source px → hi px
const hi = await sharp(SRC).ensureAlpha().resize(W, H, { kernel: 'lanczos3' }).sharpen({ sigma: 1.4, m1: 0.6, m2: 1.4 }).raw().toBuffer();
const N = W * H;
console.log(`source ${SW}x${SH} → hi ${W}x${H} (K=${K.toFixed(4)})`);

// ── classify every hi pixel: alpha, ink coverage (soft), fill class, green shade ──
const ALPHA = new Uint8Array(N); // 0..255
const INKA = new Uint8Array(N); // 0..255 how much pen sits on this pixel
const CLS = new Uint8Array(N); // 0 none, 1 white, 2 green, 3 red
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
for (let i = 0; i < N; i++) {
  const o = i * 4;
  const r = hi[o], g = hi[o + 1], b = hi[o + 2], a = hi[o + 3];
  ALPHA[i] = a;
  if (a < 8) continue;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  INKA[i] = Math.round(clamp((128 - lum) / 58, 0, 1) * 255);
  if (g > r + 16 && g > b + 16) CLS[i] = 2;
  else if (r > g + 34 && r > b + 24 && r > 110) CLS[i] = 3;
  else CLS[i] = 1;
}

// green shade from a normalised box blur of the green channel over green pixels only (radius 10)
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc;
      acc += src[row + clamp(x + r + 1, 0, w - 1)] - src[row + clamp(x - r, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc;
      acc += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
    }
  }
  return out;
}
const gVal = new Float32Array(N), gW = new Float32Array(N);
for (let i = 0; i < N; i++)
  if (CLS[i] === 2 && INKA[i] < 60) {
    gVal[i] = hi[i * 4 + 1];
    gW[i] = 1;
  }
const gB = boxBlur(gVal, W, H, 16), wB = boxBlur(gW, W, H, 16);
const SHADE = new Uint8Array(N); // 0 mid, 1 light, 2 dark (for green pixels and anything painted green)
for (let i = 0; i < N; i++) {
  const v = wB[i] > 0 ? gB[i] / wB[i] : 190;
  SHADE[i] = v > 210 ? 1 : v < 142 ? 2 : 0;
}

// the palette: class means from the drawing itself
function meanColour(pred) {
  const acc = [0, 0, 0], n = { v: 0 };
  for (let i = 0; i < N; i++)
    if (pred(i)) {
      const o = i * 4;
      acc[0] += hi[o];
      acc[1] += hi[o + 1];
      acc[2] += hi[o + 2];
      n.v++;
    }
  return n.v ? acc.map((v) => Math.round(v / n.v)) : [0, 0, 0];
}
const inBox = (i, box) => {
  const x = i % W, y = (i - x) / W;
  return x >= s(box[0]) && x < s(box[2]) && y >= s(box[1]) && y < s(box[3]);
};
const PAL = {
  paper: meanColour((i) => CLS[i] === 1 && INKA[i] < 20 && ALPHA[i] > 250 && !inBox(i, GEO.eyeL.box) && !inBox(i, GEO.eyeR.box)),
  eyeWhite: meanColour((i) => CLS[i] === 1 && INKA[i] === 0 && (inBox(i, GEO.eyeL.box) || inBox(i, GEO.eyeR.box)) && hi[i * 4] > 235 && hi[i * 4 + 2] > 235),
  green: [
    meanColour((i) => CLS[i] === 2 && INKA[i] < 20 && SHADE[i] === 0),
    meanColour((i) => CLS[i] === 2 && INKA[i] < 20 && SHADE[i] === 1),
    meanColour((i) => CLS[i] === 2 && INKA[i] < 20 && SHADE[i] === 2),
  ],
  red: meanColour((i) => CLS[i] === 3 && INKA[i] < 20),
};
console.log('palette', JSON.stringify(PAL));

// the flat colour of a pixel before the pen: by class, greens by shade
const fillOf = (i, cls = CLS[i], shade = SHADE[i]) => (cls === 2 ? PAL.green[shade] : cls === 3 ? PAL.red : inBox(i, GEO.eyeL.box) || inBox(i, GEO.eyeR.box) ? PAL.eyeWhite : PAL.paper);

// ── geometry helpers (hi px) ──
function polyY(pts) {
  const P = pts.map(([x, y]) => [s(x), s(y)]);
  return (x) => {
    if (x <= P[0][0]) return P[0][1] + ((x - P[0][0]) * (P[1][1] - P[0][1])) / (P[1][0] - P[0][0]);
    for (let k = 1; k < P.length; k++) if (x <= P[k][0]) return P[k - 1][1] + ((x - P[k - 1][0]) * (P[k][1] - P[k - 1][1])) / (P[k][0] - P[k - 1][0]);
    const a = P[P.length - 2], b = P[P.length - 1];
    return b[1] + ((x - b[0]) * (b[1] - a[1])) / (b[0] - a[0]);
  };
}
function polyX(pts) {
  // x as a function of y (for the cuff lines, top → bottom)
  const P = pts.map(([x, y]) => [s(x), s(y)]);
  return (y) => {
    if (y <= P[0][1]) return P[0][0] + ((y - P[0][1]) * (P[1][0] - P[0][0])) / (P[1][1] - P[0][1]);
    for (let k = 1; k < P.length; k++) if (y <= P[k][1]) return P[k - 1][0] + ((y - P[k - 1][1]) * (P[k][0] - P[k - 1][0])) / (P[k][1] - P[k - 1][1]);
    const a = P[P.length - 2], b = P[P.length - 1];
    return b[0] + ((y - b[1]) * (b[0] - a[0])) / (b[1] - a[1]);
  };
}
function inPoly(pts) {
  const P = pts.map(([x, y]) => [s(x), s(y)]);
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}
// chamfer distance (px) from a mask, over a box {x0,y0,x1,y1}; Infinity-ish where far
function distanceFrom(mask, box) {
  box = { x0: Math.floor(box.x0), y0: Math.floor(box.y0), x1: Math.ceil(box.x1), y1: Math.ceil(box.y1) };
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const d = new Float32Array(w * h).fill(1e6);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask((box.x0 + x) + (box.y0 + y) * W)) d[y * w + x] = 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 1e6 : d[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = Math.min(d[y * w + x], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
      d[y * w + x] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const v = Math.min(d[y * w + x], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
      d[y * w + x] = v;
    }
  return (x, y) => at(x - box.x0, y - box.y0);
}
const boxOf = (b) => ({ x0: Math.floor(s(b[0])), y0: Math.floor(s(b[1])), x1: Math.ceil(s(b[2])), y1: Math.ceil(s(b[3])) });

// ── region masks ──
const chinY = polyY(GEO.chin);
const aboveChin = (x, y) => y < chinY(x);
// where the chin line lands once pepe.js has cut the head smaller about the neck: the same point
// mapped through the scale. At the centre it is the chin line itself; at the sides it lifts.
const jawY = (x) => {
  const HS = GEO.headScale, nx = s(GEO.neck[0]), ny = s(GEO.neck[1]);
  return ny + (chinY(nx + (x - nx) / HS) - ny) * HS;
};
const hand = {};
for (const side of ['L', 'R']) {
  const g = GEO['hand' + side];
  const inP = inPoly(g.poly), cuffX = polyX(g.cuff);
  const handSide = (x, y) => (g.side < 0 ? x < cuffX(y) - s(1.5) : x > cuffX(y) + s(1.5));
  const cuffBand = (x, y) => Math.abs(x - cuffX(y)) <= s(3.5);
  const box = { x0: Math.max(0, Math.floor(s(Math.min(...g.poly.map((p) => p[0]))))), y0: Math.floor(s(Math.min(...g.poly.map((p) => p[1])))), x1: Math.min(W, Math.ceil(s(Math.max(...g.poly.map((p) => p[0]))))), y1: Math.min(H, Math.ceil(s(Math.max(...g.poly.map((p) => p[1]))))) };
  // the green of the hand (and its outline): opaque, hand side of the cuff, inside the polygon
  const core = (i) => {
    const x = i % W, y = (i - x) / W;
    return ALPHA[i] > 127 && inP(x, y) && handSide(x, y);
  };
  const dist = distanceFrom(core, box);
  // the tab: sleeve pixels within 15 px of the hand → painted green, under the sleeve. It is long
  // enough that the sleeve (which laps CUFF_OVER px over the hand) still covers the joint when the
  // wrist turns, so the hand never floats free of its cuff.
  const tab = (x, y) => inP(x, y) && !handSide(x, y) && dist(x, y) <= s(15) && ALPHA[x + y * W] > 127;
  hand[side] = { box, inP, cuffX, handSide, cuffBand, core, tab, meanGreen: null };
  hand[side].meanGreen = meanColour((i) => core(i) && CLS[i] === 2 && INKA[i] < 20 && SHADE[i] === 0);
}

// eye interiors: the convex hull of the eye's white pixels (the pupil sits between them)
function hull(points) {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const eye = {};
for (const side of ['L', 'R']) {
  const g = GEO['eye' + side];
  const box = boxOf(g.box);
  const pts = [];
  for (let y = box.y0; y < box.y1; y += 2) for (let x = box.x0; x < box.x1; x += 2) {
    const i = x + y * W;
    if (CLS[i] === 1 && INKA[i] < 40 && ALPHA[i] > 200) pts.push([x, y]);
  }
  const hp = hull(pts).map(([x, y]) => [x / K, y / K]); // inPoly scales by K
  const inHull = inPoly(hp);
  const hullMask = (i) => {
    const x = i % W, y = (i - x) / W;
    return inHull(x, y);
  };
  const dIn = distanceFrom((i) => !hullMask(i), box); // distance to the outside (depth inside the hull)
  const dOut = distanceFrom(hullMask, box); // distance to the hull from outside
  eye[side] = { box, inHull, dIn, dOut, pupil: g.pupil, centre: g.centre, lidGreen: null };
  eye[side].lidGreen = meanColour((i) => inBox(i, g.box) && CLS[i] === 2 && INKA[i] < 20 && !hullMask(i));
}

// the mouth: the connected component of red + ink that contains the red, in the mouth box
const mouth = (() => {
  const box = boxOf(GEO.mouth.box);
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const m = new Uint8Array(w * h);
  const stack = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = box.x0 + x + (box.y0 + y) * W;
    if (CLS[i] === 3 && INKA[i] < 100) {
      m[y * w + x] = 1;
      stack.push(x, y);
    }
  }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || m[ny * w + nx]) continue;
      const i = box.x0 + nx + (box.y0 + ny) * W;
      if (CLS[i] === 3 || INKA[i] > 110) {
        m[ny * w + nx] = 1;
        stack.push(nx, ny);
      }
    }
  }
  const core = (i) => {
    const x = i % W - box.x0, y = (i - (i % W)) / W - box.y0;
    return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  };
  const dist = distanceFrom(core, box);
  const mask = (x, y) => dist(x, y) <= s(1.2);
  const wide = (x, y) => dist(x, y) <= s(2.6); // the skin painted under the mouths: past the pen's soft edge
  const near = (x, y) => dist(x, y) <= s(11);
  return { box, mask, wide, near, core };
})();

// ── the cloth ───────────────────────────────────────────────────────────────────────────────────
// THE ROBE IS BARE PAPER. That is the rule the folios keep and the one this piece kept breaking:
// hatch density IS the light, so the lit plane of a white garment is drawn by leaving the paper
// alone (STYLE.md §1.3, and the mustard suit in fd-anim-courtyard-three-figures, which carries no
// tone at all on its lit front). An earlier round laid a twill and a rain-shower edge to edge over
// the whole garment at half opacity; every stroke was a grey, every square inch had the same
// number of them, and the robe read as one flat grey wash — the exact opposite of the rule.
//
// So the pen goes on the robe in three places only, and nowhere else:
//   · under each forearm, where the sleeve shades the lap;
//   · under the crossed legs, along the hem the bench holds up;
//   · down his left shoulder and upper arm — the side the key (stage left) cannot see.
// The strokes are the room's: 2 source px wide (≈ the room's 2 px pen), 8.5 px apart, hanging the
// way cloth does, full ink and never a grey, crowding to the lines the drawing already made and
// stopping the moment they meet one.
const BODY_BOX = { x0: 0, y0: Math.floor(s(60)), x1: W, y1: H };
const CLOTH = await (async () => {
  const rand = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = rand(20260904);
  const rad = (d) => (d * Math.PI) / 180;

  // ---- masks and fields, at SOURCE resolution: stroke placement needs no more than that
  const SR = new Uint8Array(SW * SH); // bare robe: paper class, no pen on it, below the chin
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const X = Math.min(W - 1, Math.round((x + 0.5) * K)), Y = Math.min(H - 1, Math.round((y + 0.5) * K));
      const i = X + Y * W;
      if (ALPHA[i] < 220 || aboveChin(X, Y) || CLS[i] !== 1 || INKA[i] > 60) continue;
      let onHand = false;
      for (const side of ['L', 'R']) if (hand[side].inP(X, Y) && hand[side].handSide(X, Y)) onHand = true;
      if (!onHand) SR[x + y * SW] = 1;
    }
  const robe = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH && SR[x + y * SW] === 1;
  // distance into the robe from the nearest pen line or edge (two chamfer passes)
  const dEdge = new Float32Array(SW * SH);
  const D = (x, y) => (x < 0 || y < 0 || x >= SW || y >= SH ? 1e6 : dEdge[x + y * SW]);
  function measure() {
    for (let k = 0; k < SW * SH; k++) dEdge[k] = SR[k] ? 1e6 : 0;
    for (let y = 0; y < SH; y++)
      for (let x = 0; x < SW; x++) dEdge[x + y * SW] = Math.min(D(x, y), D(x - 1, y) + 1, D(x, y - 1) + 1, D(x - 1, y - 1) + 1.414, D(x + 1, y - 1) + 1.414);
    for (let y = SH - 1; y >= 0; y--)
      for (let x = SW - 1; x >= 0; x--) dEdge[x + y * SW] = Math.min(D(x, y), D(x + 1, y) + 1, D(x, y + 1) + 1, D(x + 1, y + 1) + 1.414, D(x - 1, y + 1) + 1.414);
    // how far the cloth runs before it meets a boundary in each direction: "under a ledge" is the
    // one that matters, because the light in this room comes from above
    for (let x = 0; x < SW; x++) {
      let c = 0;
      for (let y = 0; y < SH; y++) dUp[x + y * SW] = c = SR[x + y * SW] ? c + 1 : 0;
      c = 0;
      for (let y = SH - 1; y >= 0; y--) dDown[x + y * SW] = c = SR[x + y * SW] ? c + 1 : 0;
    }
    for (let y = 0; y < SH; y++) {
      let c = 0;
      for (let x = 0; x < SW; x++) dIn[x + y * SW] = c = SR[x + y * SW] ? c + 1 : 0;
      c = 0;
      for (let x = SW - 1; x >= 0; x--) {
        c = SR[x + y * SW] ? c + 1 : 0;
        dIn[x + y * SW] = Math.min(dIn[x + y * SW], c);
      }
    }
  }
  const dUp = new Float32Array(SW * SH), dDown = new Float32Array(SW * SH), dIn = new Float32Array(SW * SH);
  measure();
  // The three places the pen is allowed, read off the drawing (source px). Everywhere else the
  // robe is bare paper — the chest, the front of the lap, the lit shoulder, the whole near sleeve.
  // (k weights them: the key is stage left, so his lit side takes less than his shaded one)
  const WEDGES = [
    { c: [150, 332], r: [78, 42], k: 0.84 }, // under his right forearm — the lit side, a little lighter
    { c: [346, 324], r: [66, 38], k: 1.0 }, // under his left forearm
    { c: [244, 396], r: [146, 34], k: 0.95 }, // under the crossed legs, along the hem on the bench
    // the shoulder and upper arm away from the lamp. It STOPS above the elbow: run it down to the
    // forearm and the two wedges join into one long band down his side, which is a wash again.
    { c: [346, 222], r: [42, 62], k: 1.0 },
  ];
  // a wedge is a PATCH with a ragged edge, not a soft blob: full weight over most of its area and
  // gone within a few pixels of its rim
  const wedge = (x, y) => {
    let z = 0;
    for (const w of WEDGES) z = Math.max(z, w.k * clamp((1 - Math.hypot((x - w.c[0]) / w.r[0], (y - w.c[1]) / w.r[1])) * 2.4, 0, 1));
    return z;
  };
  const tone = (x, y) => {
    if (!robe(x, y)) return 0;
    const z = wedge(x, y);
    if (z <= 0.02) return 0;
    const k = x + y * SW;
    // inside a wedge the tone is still read the way a draughtsman reads it: crowding to the lines
    // the drawing already made, heaviest immediately under a ledge (the light is above him) and
    // along the hem the bench holds up.
    let t = 0.52; // the wedge itself is one level of tone, the way a level of rain covers a wall
    t += 0.55 * Math.pow(1 - clamp(dEdge[k] / 11, 0, 1), 1.25); // crowding to the drawing's lines
    t += 0.52 * (1 - clamp(dUp[k] / 22, 0, 1)); // and hardest immediately under a ledge
    t += 0.45 * (1 - clamp(dDown[k] / 13, 0, 1)) * (y > 340 ? 1 : 0); // the hem on the bench
    return t * z;
  };

  // ---- the pen
  const paths = [];
  const ink = `rgb(${INK[0]},${INK[1]},${INK[2]})`;
  const pen = (pts, width, opacity) => {
    if (pts.length < 2) return;
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    paths.push(`<path d="${d}" fill="none" stroke="${ink}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity.toFixed(2)}"/>`);
  };
  // one stroke of the pen laid on the cloth: it runs until the cloth runs out, and it wobbles
  const stroke = (x0, y0, ang, len, { width = 1.15, opacity = 0.55, wob = 0.34, step = 1.6, stopAtInk = 1.1 } = {}) => {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const pts = [];
    for (let u = 0; u <= len; u += step) {
      const px = x0 + dx * u, py = y0 + dy * u;
      const ix = Math.round(px), iy = Math.round(py);
      if (!robe(ix, iy) || dEdge[ix + iy * SW] < stopAtInk) break;
      const w = (rng() - 0.5) * 2 * wob;
      pts.push([px - dy * w, py + dx * w]);
    }
    if (pts.length >= 2) pen(pts, width, opacity);
    return pts.length;
  };

  // ---- the hatch. One lattice, the room's spacing (ink-tiles.js draws its rain at 11 texels for
  // one level of tone, 8 for two, and the tile is shown at about a texel a pixel). Strokes hang
  // the way cloth does; over the lap they follow the crossed legs round. Full ink, always: a pen
  // has one pressure, and a half-opacity stroke is a grey, which this world does not own.
  const SPACING = 8.5;
  for (let y = 150; y < SH; y += SPACING)
    for (let x = 0; x < SW; x += SPACING) {
      const px = x + (rng() - 0.5) * SPACING * 0.8, py = y + (rng() - 0.5) * SPACING * 0.8;
      const ix = Math.round(px), iy = Math.round(py);
      if (!robe(ix, iy)) continue;
      const t = tone(ix, iy);
      if (t < 0.24) continue;
      if (t < 0.66 && rng() > (t - 0.20) * 2.3) continue; // the edge of a patch of hatch is ragged
      const base = iy > 312 ? rad(64 + (px > 244 ? 0 : 52)) : Math.PI / 2;
      stroke(px, py, base + (rng() - 0.5) * 0.2, 18 + 34 * Math.min(1, t), { width: 2.0, opacity: 1, wob: 0.42, stopAtInk: 1.6 });
    }
  // the second direction, only where the wedge runs right up under a line: cross-hatch is how a
  // mass gets built, and it is the only place on this garment that gets one.
  for (let y = 150; y < SH; y += SPACING * 1.3)
    for (let x = 0; x < SW; x += SPACING * 1.3) {
      const px = x + (rng() - 0.5) * SPACING, py = y + (rng() - 0.5) * SPACING;
      const ix = Math.round(px), iy = Math.round(py);
      if (!robe(ix, iy)) continue;
      const t = tone(ix, iy);
      if (t < 0.96 || rng() > (t - 0.92) * 2.2) continue;
      stroke(px, py, rad(24) + (rng() - 0.5) * 0.26, 8 + 14 * Math.min(1, t), { width: 1.9, opacity: 1, wob: 0.4, stopAtInk: 1.6 });
    }

  console.log(`cloth: ${paths.length} strokes`);
  const bw = BODY_BOX.x1 - BODY_BOX.x0, bh = BODY_BOX.y1 - BODY_BOX.y0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="${BODY_BOX.x0 / K} ${BODY_BOX.y0 / K} ${bw / K} ${bh / K}">${paths.join('')}</svg>`;
  const raw = await sharp(Buffer.from(svg), { limitInputPixels: false }).ensureAlpha().raw().toBuffer();
  return (x, y) => {
    const px = x - BODY_BOX.x0, py = y - BODY_BOX.y0;
    if (px < 0 || py < 0 || px >= bw || py >= bh) return 0;
    return raw[(py * bw + px) * 4 + 3];
  };
})();

// ── one pen: re-cut the drawing's marker to the room's weight, and peel its contour off ─────────
// Everything above this line reads the drawing as it was supplied. Everything below prints it.
// The pen is re-cut about its own centre line: for a pixel `dP` inside a stroke whose local
// half-width is `R`, the distance to that centre line is `R - dP`, so the stroke survives where
// `R - dP` is within half the new pen. A stroke already thin enough keeps all of itself. Then the
// band of ink that ran round the outside is deleted and the alpha eroded to its middle: the ink
// pass finds the silhouette there and draws it, so his contour is the room's line, not his own.
{
  const t0 = Date.now();
  // chamfer distance (hi px) to the nearest zero of a mask, over the whole sheet
  const dist = (mask) => {
    const d = new Float32Array(N);
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[x + y * W]);
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
  };
  // sliding-window maximum, separable: the local ridge height of the distance field
  const maxFilter = (src, r) => {
    const out = new Float32Array(N), tmp = new Float32Array(N);
    const run = (get, set, n, stride) => {
      const q = new Int32Array(n);
      let h = 0, t = 0;
      for (let i = 0; i < n; i++) {
        while (t > h && get(q[t - 1]) <= get(i)) t--;
        q[t++] = i;
        if (q[h] < i - 2 * r) h++;
        if (i >= r) set(i - r, get(q[h]));
      }
      for (let i = n; i < n + r; i++) {
        if (q[h] < i - 2 * r) h++;
        set(i - r, get(q[h]));
      }
      void stride;
    };
    for (let y = 0; y < H; y++) run((i) => src[y * W + i], (i, v) => (tmp[y * W + i] = v), W);
    for (let x = 0; x < W; x++) run((i) => tmp[i * W + x], (i, v) => (out[i * W + x] = v), H);
    return out;
  };
  const half = s(PEN_W) / 2;
  // the pen, and only the pen: near-black. INKA (a soft ramp off 128) also catches the drawing's
  // airbrushed dark green under the jaw, which is a FILL — it stays a flat second green below.
  const penMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (ALPHA[i] < 100) continue;
    const o = i * 4;
    penMask[i] = 0.299 * hi[o] + 0.587 * hi[o + 1] + 0.114 * hi[o + 2] < 88 ? 1 : 0;
  }
  const dP = dist(penMask);
  const ridge = maxFilter(dP, Math.ceil(s(CONTOUR_W) * 0.85));
  const inside = new Uint8Array(N);
  for (let i = 0; i < N; i++) inside[i] = ALPHA[i] > 127 ? 1 : 0;
  const dA = dist(inside);
  const peel = s(CONTOUR_W) / 2; // how far in the middle of the old contour ran
  const clear = peel + half + s(0.8); // and how far in the ink pass's own line will reach
  for (let i = 0; i < N; i++) {
    ALPHA[i] = Math.round(clamp(dA[i] - peel + 0.5, 0, 1) * 255);
    if (!ALPHA[i] || dA[i] < clear) {
      INKA[i] = 0;
      continue;
    }
    // one pen, one pressure: the stroke is ink or it is paper, never a grey (STYLE.md §1.2)
    INKA[i] = penMask[i] ? Math.round(clamp((dP[i] - (ridge[i] - half)) / 1.5 + 0.5, 0, 1) * 255) : 0;
  }
  // the one number that says whether the discipline is being kept: how much of the figure is ink
  let np = 0, ni = 0;
  for (let i = 0; i < N; i++) {
    if (ALPHA[i] > 200) np++;
    if (ALPHA[i] > 200 && INKA[i] > 200) ni++;
  }
  if (PREVIEW) {
    const g = Buffer.alloc(N * 2);
    for (let i = 0; i < N; i++) {
      g[i * 2] = 255 - INKA[i];
      g[i * 2 + 1] = ALPHA[i];
    }
    mkdirSync(PREVIEW, { recursive: true });
    await sharp(g, { raw: { width: W, height: H, channels: 2 } }).flatten({ background: '#cfcfcf' }).resize(700).png().toFile(PREVIEW + '/onepen.png');
  }
  console.log(`ink coverage: ${((100 * ni) / np).toFixed(1)}% of the figure`);
  console.log(`one pen: ${PEN_W} src px, contour peeled ${CONTOUR_W} src px (${Date.now() - t0} ms)`);
}
// the colour plate, out of register under the line: where a pixel takes its flat colour from
const MDX = Math.round(s(MISREG[0])), MDY = Math.round(s(MISREG[1]));
const misIdx = (i) => {
  const x = i % W, y = (i - x) / W;
  return Math.max(0, x - MDX) + Math.max(0, y - MDY) * W;
};

// ── compose a pixel: flat fill (or the drawing's own colour) under the pen ──
function pixel(i, out, o, { cls = null, shade = null, ink = INKA[i], alpha = ALPHA[i], forceFill = null } = {}) {
  let r, g, b;
  const j = cls === null && shade === null && !forceFill ? misIdx(i) : i;
  if (FILL === 'soft' && !forceFill) {
    r = hi[i * 4];
    g = hi[i * 4 + 1];
    b = hi[i * 4 + 2];
  } else {
    const f = forceFill ?? fillOf(j, cls ?? CLS[j], shade ?? SHADE[j]);
    const k = ink / 255;
    r = f[0] + (INK[0] - f[0]) * k;
    g = f[1] + (INK[1] - f[1]) * k;
    b = f[2] + (INK[2] - f[2]) * k;
  }
  out[o] = r;
  out[o + 1] = g;
  out[o + 2] = b;
  out[o + 3] = alpha;
}

// bleed opaque colour into the transparent neighbours (no dark fringes under bilinear filtering)
function bleed(buf, w, h, passes = 8) {
  // `filled` marks pixels whose colour is meaningful: opaque ones, then the ones bled into
  const filled = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) filled[i] = buf[i * 4 + 3] > 0 ? 1 : 0;
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(filled);
    let changed = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (filled[k]) continue;
        let n = 0, r = 0, g = 0, b = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (!filled[q]) continue;
          r += buf[q * 4];
          g += buf[q * 4 + 1];
          b += buf[q * 4 + 2];
          n++;
        }
        if (!n) continue;
        buf[k * 4] = Math.round(r / n);
        buf[k * 4 + 1] = Math.round(g / n);
        buf[k * 4 + 2] = Math.round(b / n);
        next[k] = 1;
        changed++;
      }
    filled.set(next);
    if (!changed) break;
  }
}

// a layer: a box in hi px + a per-pixel rule that writes RGBA or leaves it clear
const layers = {};
function makeLayer(name, box, rule, { quad = false } = {}) {
  const x0 = Math.max(0, Math.floor(box.x0)), y0 = Math.max(0, Math.floor(box.y0)), x1 = Math.min(W, Math.ceil(box.x1)), y1 = Math.min(H, Math.ceil(box.y1));
  const w = x1 - x0, h = y1 - y0;
  const buf = new Uint8Array(w * h * 4);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const X = x0 + x, Y = y0 + y;
      const o = (y * w + x) * 4;
      rule(X + Y * W, X, Y, buf, o);
      if (buf[o + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  if (maxX < 0) throw new Error(`layer ${name} is empty`);
  // crop to content (+2 px)
  const cx0 = Math.max(0, minX - 2), cy0 = Math.max(0, minY - 2), cx1 = Math.min(w, maxX + 3), cy1 = Math.min(h, maxY + 3);
  const cw = cx1 - cx0, ch = cy1 - cy0;
  const crop = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) crop.set(buf.subarray(((y + cy0) * w + cx0) * 4, ((y + cy0) * w + cx1) * 4), y * cw * 4);
  bleed(crop, cw, ch);
  // occupied cells (with a one-cell margin so the alpha-tested edge never meets a mesh edge)
  const cols = Math.ceil(cw / CELL), rows = Math.ceil(ch / CELL);
  const occ = new Uint8Array(cols * rows);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) if (crop[(y * cw + x) * 4 + 3] > 0) occ[Math.floor(y / CELL) * cols + Math.floor(x / CELL)] = 1;
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let any = 0;
      for (let dr = -1; dr <= 1 && !any; dr++) for (let dc = -1; dc <= 1 && !any; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && occ[rr * cols + cc]) any = 1;
      }
      if (any) cells.push(c, r);
    }
  layers[name] = { file: `cutout-${name}.png`, box: [x0 + cx0, y0 + cy0, cw, ch], cell: CELL, cells: quad ? null : cells, quad, buf: crop, w: cw, h: ch };
  console.log(`layer ${name}: ${cw}x${ch} at (${x0 + cx0},${y0 + cy0}) ${quad ? 'quad' : cells.length / 2 + ' cells'}`);
}

// ── the layers ──
// head: from the chin line up, without the mouth and the pupils (painted skin / eye white)
makeLayer('head', { x0: s(140), y0: 0, x1: s(345), y1: s(160) }, (i, x, y, buf, o) => {
  if (ALPHA[i] < 8 || !aboveChin(x, y)) return;
  if (mouth.wide(x, y)) return pixel(i, buf, o, { cls: 2, shade: 0, ink: 0, alpha: 255 });
  // the drawing's airbrush halo around the lips would trace the missing mouth: mid green near it
  if (mouth.near(x, y) && CLS[i] === 2) return pixel(i, buf, o, { shade: 0 });
  for (const side of ['L', 'R']) {
    const e = eye[side];
    if (inBox(i, GEO['eye' + side].box) && e.inHull(x, y) && e.dIn(x, y) > s(0.8)) return pixel(i, buf, o, { forceFill: PAL.eyeWhite, ink: 0, alpha: 255 });
  }
  pixel(i, buf, o);
});
// body: everything below the chin line except the hands; the collar band runs on white under the head
// The sleeve does not stop at the cuff: it runs CUFF_OVER past it, over the hand, and the cuff line
// is drawn at that new edge — so the sleeve and the hand share one line, and the hinge stays covered
// when the wrist turns (a paper puppet's sleeve always laps its own joint). See CUFF_OVER.
const CUFF_OVER = 5.2; // source px of sleeve laid over the hand
makeLayer('body', BODY_BOX, (i, x, y, buf, o) => {
  if (ALPHA[i] < 8) return;
  for (const side of ['L', 'R']) {
    const h = hand[side];
    if (!h.inP(x, y) || !h.handSide(x, y)) continue;
    const d = (x - h.cuffX(y)) * GEO['hand' + side].side; // source px past the cuff, toward the hand
    if (d > s(CUFF_OVER)) return; // the hand's own territory
    // the cuff: one pen line at the lapped edge, the sleeve's white behind it
    const edge = s(CUFF_OVER) - s(1.9) + Math.sin(y * 0.035) * s(0.45);
    const cov = clamp((s(2.05) - Math.abs(d - edge)) / s(0.9), 0, 1);
    return pixel(i, buf, o, { forceFill: PAL.paper, ink: Math.round(cov * 255), alpha: 255 });
  }
  if (aboveChin(x, y)) {
    // the collar. The robe runs on white from just above the jaw the head will have down to the
    // chin line, and its neckline is drawn 4 px under that jaw — so the head sits IN a collar
    // instead of being pasted on at a hard seam, and nothing shows through at the shoulder.
    if (x < s(GEO.collarX[0]) || x > s(GEO.collarX[1])) return;
    const j = jawY(x);
    if (y < j - s(1.6) || y > chinY(x)) return;
    const line = Math.min(j + s(4), chinY(x) - s(0.4));
    const cov = clamp((s(2.0) - Math.abs(y - line)) / s(0.9), 0, 1);
    return pixel(i, buf, o, { forceFill: PAL.paper, ink: Math.round(cov * 255), alpha: 255 });
  }
  // the robe carries the cloth drawn above; it never touches the green or the drawing's own pen
  const cl = CLS[i] === 1 ? CLOTH(x, y) : 0;
  pixel(i, buf, o, { ink: cl ? INKA[i] + ((255 - INKA[i]) * cl) / 255 : INKA[i] });
});
// hands: the hand with its outline, the cuff line, and a green tab under the sleeve
for (const side of ['L', 'R']) {
  const h = hand[side];
  makeLayer('hand' + side, h.box, (i, x, y, buf, o) => {
    if (h.core(i)) return pixel(i, buf, o);
    // the cuff line's core stays on the hand too (it is on the body above it as well); the rest of the
    // band and the tab are the hand's green running on under the sleeve — never a scrap of sleeve white
    if (h.cuffBand(x, y) && h.inP(x, y) && ALPHA[i] > 127 && INKA[i] > 140) return pixel(i, buf, o, { cls: 2, shade: 0 });
    if (h.tab(x, y) || (h.cuffBand(x, y) && h.inP(x, y) && ALPHA[i] > 127)) return pixel(i, buf, o, { forceFill: h.meanGreen, ink: 0, alpha: 255 });
  });
}
// pupils: a disc (with the drawing's small highlight) on a clear field the size of the eye box
const ell = (x, y, cx, cy, rx, ry) => Math.hypot((x - cx) / rx, (y - cy) / ry);
for (const side of ['L', 'R']) {
  const e = eye[side], p = e.pupil;
  const cx = s(p.c[0]), cy = s(p.c[1]), rx = s(p.rx), ry = s(p.ry), hx = s(p.hi[0]), hy = s(p.hi[1]);
  makeLayer('pupil' + side, e.box, (i, x, y, buf, o) => {
    const d = ell(x + 0.5, y + 0.5, cx, cy, rx, ry);
    const cov = clamp((1 - d) * Math.min(rx, ry) + 0.5, 0, 1);
    if (cov <= 0) return;
    const hl = clamp((1 - ell(x + 0.5, y + 0.5, hx, hy, s(2.2), s(2))) * s(2) + 0.5, 0, 1);
    buf[o] = INK[0] + (PAL.eyeWhite[0] - INK[0]) * hl;
    buf[o + 1] = INK[1] + (PAL.eyeWhite[1] - INK[1]) * hl;
    buf[o + 2] = INK[2] + (PAL.eyeWhite[2] - INK[2]) * hl;
    buf[o + 3] = Math.round(cov * 255);
  }, { quad: true });
}
// eye lines: the pen of both eye regions, so the heavy lids sit over the pupils
makeLayer('eyelines', { x0: eye.L.box.x0, y0: Math.min(eye.L.box.y0, eye.R.box.y0), x1: eye.R.box.x1, y1: Math.max(eye.L.box.y1, eye.R.box.y1) }, (i, x, y, buf, o) => {
  if (INKA[i] < 40 || ALPHA[i] < 128) return;
  // only the lines of the eyes themselves: inside or within 6 px of a hull
  if (Math.min(eye.L.dOut(x, y), eye.R.dOut(x, y)) > s(6)) return;
  buf[o] = INK[0];
  buf[o + 1] = INK[1];
  buf[o + 2] = INK[2];
  buf[o + 3] = INKA[i];
}, { quad: true });
// closed lids: skin over the eye white, a thick dark lower edge (the lid line), a thin crease
for (const side of ['L', 'R']) {
  const e = eye[side];
  makeLayer('lid' + side, e.box, (i, x, y, buf, o) => {
    const dOut = e.dOut(x, y);
    if (dOut > s(1.6)) return;
    const dIn = e.dIn(x, y);
    // the lower edge: pixels whose nearest outside is below them (the mask's bottom arc)
    let below = 0;
    for (let k = 1; k <= 7; k++) if (!e.inHull(x, y + k * s(1))) { below = 1; break; }
    // the lash line of a closed lid is a loaded stroke, but it is still the same pen
    const lowerLine = below && dIn <= s(PEN_W * 1.15) && y > s(e.centre[1]) - s(2);
    const f = lowerLine ? INK : PAL.green[0];
    buf[o] = f[0];
    buf[o + 1] = f[1];
    buf[o + 2] = f[2];
    buf[o + 3] = 255;
  }, { quad: true });
}
// mouths
makeLayer('mouthRest', mouth.box, (i, x, y, buf, o) => {
  if (!mouth.mask(x, y) || ALPHA[i] < 8) return;
  pixel(i, buf, o, { alpha: 255 });
}, { quad: true });
async function svgLayer(name, box, svgInner) {
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${box.x0} ${box.y0} ${w} ${h}">${svgInner}</svg>`;
  const raw = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  makeLayer(name, box, (i, x, y, buf, o) => {
    const q = ((y - box.y0) * w + (x - box.x0)) * 4;
    if (raw[q + 3] < 8) return;
    buf[o] = raw[q];
    buf[o + 1] = raw[q + 1];
    buf[o + 2] = raw[q + 2];
    buf[o + 3] = raw[q + 3];
  }, { quad: true });
}
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mc = [s(GEO.mouth.centre[0]), s(GEO.mouth.centre[1])];
const DARK = 'rgb(46,26,24)';
// a small open "o": red rim, dark inside, the pen around it — the lips pursed
await svgLayer('mouthO', mouth.box, `
  <ellipse cx="${mc[0]}" cy="${mc[1] + s(1)}" rx="${s(17)}" ry="${s(12.5)}" fill="${rgb(PAL.red)}" stroke="${rgb(INK)}" stroke-width="${s(PEN_W)}"/>
  <ellipse cx="${mc[0]}" cy="${mc[1] + s(1.5)}" rx="${s(10.5)}" ry="${s(6.5)}" fill="${DARK}"/>
  <path d="M ${mc[0] - s(15)} ${mc[1] - s(8)} Q ${mc[0] - s(5)} ${mc[1] - s(11.5)} ${mc[0] + s(6)} ${mc[1] - s(9.5)}" fill="none" stroke="${rgb(INK)}" stroke-width="${s(PEN_W)}" stroke-linecap="round"/>
`);
// a thin closed mouth: the lips pressed to a line, still red, the pen above and below
const fx0 = mc[0] - s(46), fx1 = mc[0] + s(48);
const flatPath = `M ${fx0} ${mc[1] - s(2)} C ${mc[0] - s(20)} ${mc[1] + s(3)}, ${mc[0] + s(15)} ${mc[1] + s(4)}, ${fx1} ${mc[1] + s(1)}`;
await svgLayer('mouthFlat', mouth.box, `
  <path d="${flatPath}" fill="none" stroke="${rgb(INK)}" stroke-width="${s(4.6 + 2 * PEN_W)}" stroke-linecap="round"/>
  <path d="${flatPath}" fill="none" stroke="${rgb(PAL.red)}" stroke-width="${s(4.6)}" stroke-linecap="round"/>
  <path d="M ${fx0 - s(6)} ${mc[1] - s(6)} q ${s(4)} ${s(3)} ${s(6)} ${s(9)}" fill="none" stroke="${rgb(INK)}" stroke-width="${s(PEN_W)}" stroke-linecap="round"/>
`);

// ── write ──
mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [name, L] of Object.entries(layers)) {
  const info = await sharp(Buffer.from(L.buf.buffer, L.buf.byteOffset, L.buf.length), { raw: { width: L.w, height: L.h, channels: 4 } })
    .png({ compressionLevel: 9, effort: 8 })
    .toFile(OUT + L.file);
  total += info.size;
  console.log(`wrote ${L.file} ${(info.size / 1024).toFixed(0)} KB`);
}
console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`);

const A = (p) => [s(p[0]), s(p[1])];
const manifest = {
  source: 'pepe-meditation.webp',
  srcSize: [SW, SH],
  hiSize: [W, H],
  K,
  fill: FILL,
  palette: PAL,
  anchors: {
    neck: A(GEO.neck),
    headCentre: A(GEO.headCentre),
    eyeL: A(GEO.eyeL.centre),
    eyeR: A(GEO.eyeR.centre),
    pupilL: A(GEO.eyeL.pupil.c),
    pupilR: A(GEO.eyeR.pupil.c),
    mouth: A(GEO.mouth.centre),
    wristL: A(GEO.handL.wrist),
    wristR: A(GEO.handR.wrist),
    feet: [s(SW / 2), H],
  },
  layers: Object.fromEntries(Object.entries(layers).map(([n, L]) => [n, { file: L.file, box: L.box, cell: L.cell, cells: L.cells, quad: L.quad }])),
};
writeFileSync(OUT + 'cutout.json', JSON.stringify(manifest));
console.log('wrote cutout.json');

// ── previews ──
if (PREVIEW) {
  mkdirSync(PREVIEW, { recursive: true });
  // the full composite of head over body over hands, on grey, at the working resolution
  const grey = { create: { width: W, height: H, channels: 4, background: '#cfcfcf' } };
  const comp = (names) => names.map((n) => ({ input: Buffer.from(layers[n].buf.buffer, layers[n].buf.byteOffset, layers[n].buf.length), raw: { width: layers[n].w, height: layers[n].h, channels: 4 }, left: layers[n].box[0], top: layers[n].box[1] }));
  await sharp(grey).composite(comp(['handL', 'handR', 'body', 'head', 'pupilL', 'pupilR', 'eyelines', 'mouthRest'])).png().toFile(`${PREVIEW}/assembled.png`);
  await sharp(grey).composite(comp(['handL', 'handR', 'body', 'head', 'pupilL', 'pupilR', 'eyelines', 'lidL', 'lidR', 'mouthO'])).png().toFile(`${PREVIEW}/assembled-blink-o.png`);
  await sharp(grey).composite(comp(['handL', 'handR', 'body', 'head', 'pupilL', 'pupilR', 'eyelines', 'mouthFlat'])).png().toFile(`${PREVIEW}/assembled-flat.png`);
  // exploded: each moving layer offset so the seams show
  const off = (n, dx, dy) => ({ ...comp([n])[0], left: layers[n].box[0] + dx, top: layers[n].box[1] + dy });
  await sharp(grey).composite([off('handL', -90, 60), off('handR', 90, 60), comp(['body'])[0], off('head', 0, -120), off('pupilL', 0, -120), off('pupilR', 0, -120), off('eyelines', 0, -120), off('mouthRest', 0, -120)]).png().toFile(`${PREVIEW}/exploded.png`);
  if (TRACE) {
    const { default: ImageTracer } = await import('imagetracerjs');
    const src = await sharp(SRC).ensureAlpha().raw().toBuffer();
    const svg = ImageTracer.imagedataToSVG({ width: SW, height: SH, data: new Uint8ClampedArray(src.buffer, src.byteOffset, src.length) }, { numberofcolors: 8, colorquantcycles: 4, ltres: 0.5, qtres: 0.5, pathomit: 4, blurradius: 0, strokewidth: 0, linefilter: true, scale: K, roundcoords: 2, viewbox: false, rightangleenhance: false });
    await sharp(Buffer.from(svg)).flatten({ background: '#cfcfcf' }).png().toFile(`${PREVIEW}/trace.png`);
    console.log('wrote trace preview');
  }
  console.log('previews in', PREVIEW);
}
