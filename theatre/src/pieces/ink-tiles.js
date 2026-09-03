// ink-tiles — the hatching "tonal art map" and the paper grain, drawn once at build time with the
// same pen as everything else (strokes.js). Four tone levels per surface family, packed one level
// per channel of a seamless tile:
//   R = light   sparse vertical rain-strokes (the walls in the reference)
//   G = mid     denser parallel strokes
//   B = dark    cross-hatch
//   A = darkest dense three-way cross-hatch (reads as near-black, still made of strokes)
// Two families: 'wall' (verticals) for standing surfaces and 'floor' (dash rows) for surfaces
// that face up. Every tile is exactly periodic: strokes whose start point falls inside the tile
// are drawn, with wrap copies across the seams, using the same rng so the copies agree.
import * as THREE from 'three';
import { inkLine, makeCanvas, paper } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { bakedLevels, bakedTexture } from '../core/bake.js';

export const TILE = 512; // texels; shown at 512 css px → 1 texel per css px at nominal distance
const PEN = 1.9; // texels: the tone pen is a shade lighter than the outline pen

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

// Parallel strokes at `angle` across the tile, broken into pen-length segments. spacing/width/len
// in texels; `fill` 0..1 = fraction of each line that carries ink. Axis-aligned and 45° sets snap
// their spacing to the tile period so lines meet themselves across the seam.
function strokes(g, rng, { angle, spacing, width, wobble = 0.7, segMin, segMax, fill = 0.6, jitter = 0.35, lean = 0.02 }) {
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
      if (x1 >= 0 && x1 < TILE && y1 >= 0 && y1 < TILE) {
        const e = s + seg;
        // no clipping at the tile edge: the wrapped copy carries the tail across the seam
        if (e > s + 4) wrappedStroke(g, x1, y1, cx + ddx * e, cy + ddy * e, { width: w, wobble }, rng);
      }
      s += seg + gap;
    }
  }
}

// Short dashes in rows (floor / table-top tone). Rows are snapped to the tile period.
function dashRows(g, rng, { spacing, width, len, fill = 0.4, angle = 0, wobble = 0.5 }) {
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
      if (e > x + 4) wrappedStroke(g, x, yy, e, yy + Math.sin(a) * (e - x), { width: w, wobble }, rng);
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
export async function makeWallTiles() {
  return dataTexture(await bakedLevels('ink-wall', TILE, TILE, drawWallLevels, { deps: [strokes, wrappedStroke, levelCanvas, PEN] }));
}
export async function makeFloorTiles() {
  return dataTexture(await bakedLevels('ink-floor', TILE, TILE, drawFloorLevels, { deps: [strokes, dashRows, wrappedStroke, levelCanvas, PEN] }));
}

function drawWallLevels() {
  const V = Math.PI / 2;
  const light = levelCanvas((g, rng) => {
    // sparse rain: thin verticals with gaps, like the walls in the reference
    strokes(g, rng, { angle: V, spacing: 17, width: PEN * 0.75, segMin: 30, segMax: 150, fill: 0.34, jitter: 0.45, lean: 0.03 });
  }, 101);
  const mid = levelCanvas((g, rng) => {
    strokes(g, rng, { angle: V, spacing: 8.5, width: PEN * 0.9, segMin: 60, segMax: 300, fill: 0.7, jitter: 0.3, lean: 0.02 });
  }, 102);
  const dark = levelCanvas((g, rng) => {
    strokes(g, rng, { angle: V, spacing: 7, width: PEN, segMin: 100, segMax: 400, fill: 0.86, jitter: 0.25, lean: 0.02 });
    strokes(g, rng, { angle: 0, spacing: 7.5, width: PEN * 0.95, segMin: 100, segMax: 400, fill: 0.8, jitter: 0.3, lean: 0.04 });
  }, 103);
  const darkest = levelCanvas((g, rng) => {
    strokes(g, rng, { angle: V, spacing: 3.2, width: PEN * 1.3, segMin: 200, segMax: 500, fill: 0.97, jitter: 0.15, lean: 0.01 });
    strokes(g, rng, { angle: 0, spacing: 3.6, width: PEN * 1.2, segMin: 200, segMax: 500, fill: 0.95, jitter: 0.2, lean: 0.015 });
    strokes(g, rng, { angle: Math.PI / 4, spacing: 4.5, width: PEN * 1.1, segMin: 200, segMax: 500, fill: 0.9, jitter: 0.2, lean: 0.02 });
  }, 104);
  return packLevels([light, mid, dark, darkest]);
}

function drawFloorLevels() {
  const light = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 17, width: PEN * 0.85, len: 36, fill: 0.3 });
  }, 201);
  const mid = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 8.5, width: PEN * 0.95, len: 55, fill: 0.62 });
  }, 202);
  const dark = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 7.5, width: PEN, len: 80, fill: 0.8 });
    strokes(g, rng, { angle: Math.PI / 2, spacing: 8, width: PEN * 0.95, segMin: 100, segMax: 350, fill: 0.78, jitter: 0.3, lean: 0.05 });
  }, 203);
  const darkest = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 3.2, width: PEN * 1.3, len: 200, fill: 0.97 });
    strokes(g, rng, { angle: Math.PI / 2, spacing: 3.6, width: PEN * 1.2, segMin: 200, segMax: 500, fill: 0.95, jitter: 0.2, lean: 0.02 });
    strokes(g, rng, { angle: -Math.PI / 4, spacing: 4.5, width: PEN * 1.1, segMin: 200, segMax: 500, fill: 0.9, jitter: 0.2, lean: 0.02 });
  }, 204);
  return packLevels([light, mid, dark, darkest]);
}

// Paper grain around 1.0 (a multiplier), no vignette, no soft mottling: the paper is flat.
export async function makePaperGrain(size = 512) {
  const t = await bakedTexture(
    'ink-paper',
    size,
    size,
    (g, w, h) => {
      paper(g, w, h, '#ffffff', { grain: 0.075, seed: 17 });
      // a scatter of tiny fibres, the way laid paper catches the pen
      const rng = mulberry32(23);
      g.strokeStyle = 'rgba(0,0,0,0.055)';
      g.lineWidth = 1;
      for (let i = 0; i < 700; i++) {
        const x = rng() * w, y = rng() * h, a = rng() * Math.PI, l = 2 + rng() * 5;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
    },
    { srgb: false, repeat: [1, 1], anisotropy: 1 },
  );
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
