// ink-tiles — the hatching "tonal art map" and the paper grain, drawn once at build time with the
// same pen as everything else (strokes.js). Four tone levels per surface family, packed one level
// per channel of a seamless tile:
//   R = light   rain-strokes in CLUMPS: a few bold verticals together, bare paper between (the
//               wall beside a window in the reference: the pen thickens near the edge, then stops)
//   G = mid     continuous dense parallel strokes (the cabinet fronts, the wall against the door)
//   B = dark    cross-hatch, verticals crossed by a steep diagonal (the shadow side of a form)
//   A = darkest a three-way hatch so dense it is black; the composite draws this level as solid
//               ink, this channel only feeds the debug view and anyone reading the tile directly
// Two families: 'wall' (verticals) for standing surfaces and 'floor' (dash rows) for surfaces
// that face up. Every tile is exactly periodic: strokes whose start point falls inside the tile
// are drawn, with wrap copies across the seams, using the same rng so the copies agree.
import * as THREE from 'three';
import { inkLine, makeCanvas } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { bakedLevels, hashSource, BAKING } from '../core/bake.js';

export const TILE = 512; // texels; shown at ~1 texel per css px (the composite snaps the scale to octaves)
const PEN = 2.0; // texels: the same pen as the outlines (≈2 px at 1080p in the reference)

function wrappedStroke(g, x1, y1, x2, y2, opts, rng) {
  const seed = Math.floor(rng() * 1e9) + 1;
  const minX = Math.min(x1, x2) - 4, maxX = Math.max(x1, x2) + 4;
  const minY = Math.min(y1, y2) - 4, maxY = Math.max(y1, y2) + 4;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const segments = Math.max(2, Math.round(len / 14));
  for (let dy = -TILE; dy <= TILE; dy += TILE) {
    if (maxY + dy < 0 || minY + dy > TILE) continue;
    for (let dx = -TILE; dx <= TILE; dx += TILE) {
      if (maxX + dx < 0 || minX + dx > TILE) continue;
      inkLine(g, x1 + dx, y1 + dy, x2 + dx, y2 + dy, { ...opts, segments, rng: mulberry32(seed) });
    }
  }
}

// A periodic density field: a handful of soft elliptical blobs (distances wrapped across the tile)
// with a low floor, so a level can come in clumps with bare paper between them.
function clumpField(rng, { count = 9, rx = 60, ry = 110, floor = 0.05, amp = [0.7, 1.3] } = {}) {
  const blobs = [];
  for (let i = 0; i < count; i++) {
    blobs.push([rng() * TILE, rng() * TILE, rx * (0.6 + rng() * 0.8), ry * (0.6 + rng() * 0.8), amp[0] + rng() * (amp[1] - amp[0])]);
  }
  return (x, y) => {
    let v = floor;
    for (const [bx, by, brx, bry, a] of blobs) {
      let dx = Math.abs(x - bx);
      if (dx > TILE / 2) dx = TILE - dx;
      let dy = Math.abs(y - by);
      if (dy > TILE / 2) dy = TILE - dy;
      const q = (dx * dx) / (brx * brx) + (dy * dy) / (bry * bry);
      v = Math.max(v, a * Math.exp(-q * 1.6));
    }
    return Math.min(1, v);
  };
}
const wrap = (v) => ((v % TILE) + TILE) % TILE;

// Parallel strokes at `angle` across the tile, broken into pen-length segments. spacing/width/len
// in texels; `fill` 0..1 = fraction of each line that carries ink; `density(x, y)` 0..1 gates each
// segment by where its middle falls. Axis-aligned and 45° sets snap their spacing to the tile
// period so lines meet themselves across the seam.
function strokes(g, rng, { angle, spacing, width, wobble = 0.7, segMin, segMax, fill = 0.6, jitter = 0.35, lean = 0.02, density = null }) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const axisAligned = Math.abs(dx) < 1e-6 || Math.abs(dy) < 1e-6;
  const diagonal = Math.abs(Math.abs(dx) - Math.abs(dy)) < 1e-6;
  if (axisAligned) spacing = TILE / Math.round(TILE / spacing);
  else if (diagonal) spacing = TILE / Math.SQRT2 / Math.round(TILE / Math.SQRT2 / spacing);
  const R = TILE * 1.5;
  for (let o = -R; o <= R; o += spacing) {
    const oj = o + (rng() - 0.5) * spacing * jitter * 2;
    const a2 = angle + (rng() - 0.5) * lean;
    const ddx = Math.cos(a2), ddy = Math.sin(a2);
    const cx = TILE / 2 + nx * oj, cy = TILE / 2 + ny * oj;
    let s = -R + rng() * segMax;
    while (s < R) {
      const seg = segMin + rng() * (segMax - segMin);
      const gap = seg * ((1 - fill) / Math.max(0.05, fill)) * (0.4 + rng() * 1.2);
      const w = width * (0.8 + rng() * 0.4);
      const x1 = cx + ddx * s, y1 = cy + ddy * s;
      const keep = !density || rng() < density(wrap(x1 + ddx * seg * 0.5), wrap(y1 + ddy * seg * 0.5));
      if (keep && x1 >= 0 && x1 < TILE && y1 >= 0 && y1 < TILE) {
        const e = s + seg;
        // no clipping at the tile edge: the wrapped copy carries the tail across the seam
        if (e > s + 4) wrappedStroke(g, x1, y1, cx + ddx * e, cy + ddy * e, { width: w, wobble }, rng);
      }
      s += seg + gap;
    }
  }
}

// Short dashes in rows (floor / table-top tone). Rows are snapped to the tile period.
function dashRows(g, rng, { spacing, width, len, fill = 0.4, angle = 0, wobble = 0.5, density = null }) {
  spacing = TILE / Math.round(TILE / spacing);
  const rows = Math.round(TILE / spacing);
  for (let r = 0; r < rows; r++) {
    const y = r * spacing + (rng() - 0.5) * spacing * 0.4;
    let x = rng() * len;
    while (x < TILE) {
      const l = len * (0.5 + rng());
      const a = angle + (rng() - 0.5) * 0.06;
      const w = width * (0.8 + rng() * 0.4);
      const yy = y + (rng() - 0.5) * 1.5;
      const e = x + Math.cos(a) * l;
      const keep = !density || rng() < density(wrap(x + l * 0.5), wrap(yy));
      if (keep && e > x + 4) wrappedStroke(g, x, yy, e, yy + Math.sin(a) * (e - x), { width: w, wobble }, rng);
      x += l + l * ((1 - fill) / Math.max(0.05, fill)) * (0.4 + rng() * 1.2);
    }
  }
}

function levelCanvas(draw, seed) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  g.fillRect(0, 0, TILE, TILE);
  g.strokeStyle = '#000';
  draw(g, mulberry32(seed));
  return g.getImageData(0, 0, TILE, TILE).data;
}

function packLevels(levels) {
  const n = TILE * TILE;
  const out = new Uint8Array(n * 4);
  for (let ch = 0; ch < 4; ch++) {
    const d = levels[ch];
    for (let i = 0; i < n; i++) out[i * 4 + ch] = 255 - d[i * 4]; // coverage: 255 = ink
  }
  return out;
}

function dataTexture(out) {
  const t = new THREE.DataTexture(out, TILE, TILE, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// The tile sets are baked to public/baked/ (see src/core/bake.js); drawing them live costs seconds.
const DEPS = [strokes, dashRows, wrappedStroke, levelCanvas, clumpField, wrap, PEN];

// An empty tile set: coverage 0 everywhere, i.e. bare paper. The composite can draw with it, so
// the first frames are line work on a clean sheet rather than a broken picture.
function blankTiles() {
  return dataTexture(new Uint8Array(TILE * TILE * 4));
}

// Fill a tile set in place once its data arrives. (A DataTexture's image can be swapped; three
// re-uploads it and rebuilds the mip chain on the next needsUpdate.)
function fillTiles(tex, data) {
  tex.image = { data, width: TILE, height: TILE };
  tex.needsUpdate = true;
  return tex;
}

// bake.js names its files `<name>-<hash of the drawing source>.png`, so the URL is derivable and
// the manifest need not be fetched at all. Going through ctx.assets means the load is TRACKED:
// main.js's `await ctx.assets.settle()` waits for it, so a screenshot is never taken before the
// tone arrives, while ink's own build no longer blocks on a file — which is what made ink wear the
// dev server's first-static-request stall (measured: 41 s for a 435-byte manifest.json under load,
// against 60 ms of actual work once the connection is warm) and put it at the top of SLOW BUILDS.
async function loadLevels(ctx, name, draw) {
  const key = `${name}-${hashSource(draw, ...DEPS)}`;
  if (!BAKING && ctx?.assets?.texture) {
    try {
      const tex = await ctx.assets.texture(`/baked/${key}.png`, { srgb: false, anisotropy: false });
      const img = tex.image;
      const c = makeCanvas(TILE * 2, TILE * 2);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, TILE * 2, TILE * 2).data;
      const out = new Uint8Array(TILE * TILE * 4);
      for (let ch = 0; ch < 4; ch++) {
        const ox = (ch % 2) * TILE, oy = Math.floor(ch / 2) * TILE;
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) out[(y * TILE + x) * 4 + ch] = px[((y + oy) * TILE * 2 + x + ox) * 4];
      }
      return out;
    } catch (e) {
      console.warn(`[ink] no bake for ${key} — drawing the tiles live (seconds). Run node tools/bake.mjs`);
    }
  }
  return bakedLevels(name, TILE, TILE, draw, { deps: DEPS });
}

// Returns the two tile sets immediately (blank) plus the promise that fills them.
export function makeTiles(ctx) {
  const wall = blankTiles(), floor = blankTiles();
  const ready = Promise.all([
    loadLevels(ctx, 'ink-wall', drawWallLevels).then((d) => fillTiles(wall, d)),
    loadLevels(ctx, 'ink-floor', drawFloorLevels).then((d) => fillTiles(floor, d)),
  ]);
  return { wall, floor, ready };
}

// One texel is ≈0.9 css px in the frame, so these numbers are pen strokes on the paper: at the
// folio's density a light wall carries strokes ~40–150 px long, 12–15 px apart, in clumps.
function drawWallLevels() {
  const V = Math.PI / 2;
  const light = levelCanvas((g, rng) => {
    // clumps of rain: inside a clump a few bold verticals sit together (the pen thickening beside
    // an edge), between clumps the paper is bare. Long strokes, widely spaced: each one must read
    // as one stroke of a pen at 1600 px, not as texture.
    // Opened up from an 11 texel pitch: the first level is the wall under a cornice or beside a
    // window, and in the folios that is a handful of separate strokes with a lot of paper round
    // them — measured, a patch of it must still blur to a clean sheet, not to a grey.
    const dens = clumpField(rng, { count: 7, rx: 58, ry: 130, floor: 0.0, amp: [0.8, 1.5] });
    strokes(g, rng, { angle: V, spacing: 15, width: PEN * 1.05, segMin: 26, segMax: 130, fill: 0.44, jitter: 0.46, lean: 0.05, density: dens });
  }, 101);
  const mid = levelCanvas((g, rng) => {
    // continuous rain, still openly spaced: the wall against a door jamb, the underside of a shelf
    strokes(g, rng, { angle: V, spacing: 8, width: PEN * 1.05, segMin: 50, segMax: 240, fill: 0.8, jitter: 0.32, lean: 0.035 });
  }, 102);
  const dark = levelCanvas((g, rng) => {
    // cross-hatch: verticals crossed by one steep diagonal. Dense enough to read as the optical
    // grey the folios sit at (#646963), open enough that every stroke is still a stroke — the
    // arch behind La Brique Rouge.
    strokes(g, rng, { angle: V, spacing: 5.6, width: PEN * 1.05, segMin: 90, segMax: 360, fill: 0.9, jitter: 0.24, lean: 0.02 });
    strokes(g, rng, { angle: Math.PI / 3, spacing: 7.6, width: PEN, segMin: 90, segMax: 360, fill: 0.86, jitter: 0.28, lean: 0.03 });
  }, 103);
  const darkest = levelCanvas((g, rng) => {
    // Black, but drawn — the arch behind La Brique Rouge, the man in the black suit at the card
    // table. Two directions on a tight lattice, ~88% coverage: dense enough that a shape carrying
    // it blurs to a solid mass, open enough that you can still count the strokes and that the rim
    // breaks into separate strokes instead of ending on a vector edge. At a 4.0/4.6 pitch this
    // level only reached ~73% and a black coat drawn with it read as a mid grey.
    strokes(g, rng, { angle: V, spacing: 3.1, width: PEN * 1.2, segMin: 160, segMax: 480, fill: 0.97, jitter: 0.1, lean: 0.012 });
    strokes(g, rng, { angle: Math.PI * 0.31, spacing: 3.4, width: PEN * 1.15, segMin: 160, segMax: 480, fill: 0.96, jitter: 0.12, lean: 0.016 });
  }, 104);
  return packLevels([light, mid, dark, darkest]);
}

function drawFloorLevels() {
  const light = levelCanvas((g, rng) => {
    const dens = clumpField(rng, { count: 7, rx: 130, ry: 58, floor: 0.0, amp: [0.8, 1.5] });
    dashRows(g, rng, { spacing: 15, width: PEN * 1.05, len: 40, fill: 0.36, density: dens });
  }, 201);
  const mid = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 8, width: PEN * 1.05, len: 70, fill: 0.76 });
  }, 202);
  const dark = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 5.8, width: PEN * 1.05, len: 110, fill: 0.9 });
    strokes(g, rng, { angle: Math.PI / 2 + 0.35, spacing: 8, width: PEN, segMin: 90, segMax: 340, fill: 0.84, jitter: 0.3, lean: 0.04 });
  }, 203);
  const darkest = levelCanvas((g, rng) => {
    // the pool of dark a table stands in, seen on the boards: dashes crowded to black, crossed
    // twice so the patch blurs to a solid mass with a torn edge
    dashRows(g, rng, { spacing: 3.1, width: PEN * 1.2, len: 190, fill: 0.97 });
    strokes(g, rng, { angle: -Math.PI * 0.31, spacing: 3.4, width: PEN * 1.15, segMin: 160, segMax: 480, fill: 0.96, jitter: 0.12, lean: 0.016 });
  }, 204);
  return packLevels([light, mid, dark, darkest]);
}

// Paper grain around 1.0 (a multiplier). The folio paper is flat: a whisper of grain at the edge
// of perception, no fibres, no vignette, no mottling. It is per-texel noise and nothing else, so
// it is filled here rather than baked: a 262 KB PNG for white noise cost a file request (and the
// dev server's first static request is the seconds ink's build was being blamed for) to arrive at
// a texture that four lines of arithmetic produce in three milliseconds.
export function makePaperGrain(size = 512) {
  const n = size * size;
  const data = new Uint8Array(n * 4);
  const rng = mulberry32(17);
  const clamp8 = (x) => (x < 0 ? 0 : x > 255 ? 255 : x); // a Uint8Array wraps; this must not
  for (let i = 0; i < n; i++) {
    const d = (rng() - 0.5) * 255 * 0.016;
    data[i * 4] = data[i * 4 + 1] = clamp8(255 + d);
    data[i * 4 + 2] = clamp8(255 + d * 0.9);
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
