// ink-tiles — the hatching "tonal art map" and the paper grain, drawn once at build time with the
// same pen as everything else (strokes.js). Four tone levels per surface family, packed one level
// per channel of a seamless 1024px tile:
//   R = light   sparse vertical rain-strokes (the walls in the reference)
//   G = mid     denser parallel strokes
//   B = dark    cross-hatch
//   A = darkest dense three-way cross-hatch (reads as near-black, still made of strokes)
// Two families: 'wall' (verticals) for standing surfaces and 'floor' (dash rows) for surfaces
// that face up. Every tile is seamless: each stroke is drawn nine times, once per wrap offset,
// with the same rng so the copies agree.
import * as THREE from 'three';
import { inkLine, makeCanvas, paper } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const TILE = 1024; // texels; shown at 512 css px → a 4-texel stroke is a 2px pen line

function wrappedStroke(g, x1, y1, x2, y2, opts, rng) {
  const seed = Math.floor(rng() * 1e9) + 1;
  const minX = Math.min(x1, x2) - 8, maxX = Math.max(x1, x2) + 8;
  const minY = Math.min(y1, y2) - 8, maxY = Math.max(y1, y2) + 8;
  for (let dy = -TILE; dy <= TILE; dy += TILE) {
    if (maxY + dy < 0 || minY + dy > TILE) continue;
    for (let dx = -TILE; dx <= TILE; dx += TILE) {
      if (maxX + dx < 0 || minX + dx > TILE) continue;
      inkLine(g, x1 + dx, y1 + dy, x2 + dx, y2 + dy, { ...opts, rng: mulberry32(seed) });
    }
  }
}

// Parallel strokes at `angle` across the whole tile, broken into pen-length segments.
// spacing/width/len in texels. `fill` 0..1 = fraction of each line that carries ink.
// Segments whose start point falls inside the tile are drawn (with wrap copies), so the set is
// exactly periodic; axis-aligned spacings are snapped so lines meet themselves across the seam.
function strokes(g, rng, { angle, spacing, width, wobble = 1.4, segMin, segMax, fill = 0.6, jitter = 0.35, lean = 0.02 }) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const axisAligned = Math.abs(dx) < 1e-6 || Math.abs(dy) < 1e-6;
  if (axisAligned) spacing = TILE / Math.round(TILE / spacing);
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
        let e = s + seg;
        if (axisAligned) {
          // clip at the tile edge along the stroke so the wrapped copy does not double up
          const lim = Math.abs(dx) > 0.5 ? (dx > 0 ? (TILE - x1) / dx : -x1 / dx) : (dy > 0 ? (TILE - y1) / dy : -y1 / dy);
          e = Math.min(e, s + lim - 2);
        }
        if (e > s + 6) wrappedStroke(g, x1, y1, cx + ddx * e, cy + ddy * e, { width: w, wobble }, rng);
      }
      s += seg + gap;
    }
  }
}

// Short dashes in rows (floor / table-top tone). Rows are snapped to the tile period.
function dashRows(g, rng, { spacing, width, len, fill = 0.4, angle = 0, wobble = 0.9 }) {
  spacing = TILE / Math.round(TILE / spacing);
  const rows = Math.round(TILE / spacing);
  for (let r = 0; r < rows; r++) {
    const y = r * spacing + (rng() - 0.5) * spacing * 0.4;
    let x = rng() * len;
    while (x < TILE) {
      const l = len * (0.5 + rng());
      const a = angle + (rng() - 0.5) * 0.06;
      const w = width * (0.8 + rng() * 0.4);
      const yy = y + (rng() - 0.5) * 3;
      const e = Math.min(x + Math.cos(a) * l, TILE - 2);
      if (e > x + 6) wrappedStroke(g, x, yy, e, yy + Math.sin(a) * (e - x), { width: w, wobble }, rng);
      x += l + l * ((1 - fill) / Math.max(0.05, fill)) * (0.4 + rng() * 1.2);
    }
  }
}

function levelCanvas(draw, seed) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d');
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

const PEN = 3.6; // texels = 1.8 css px

export function makeWallTiles() {
  const V = Math.PI / 2;
  const light = levelCanvas((g, rng) => {
    // sparse rain: long thin verticals with gaps, a few extra half-strokes
    strokes(g, rng, { angle: V, spacing: 34, width: PEN * 0.72, segMin: 60, segMax: 300, fill: 0.34, jitter: 0.45, lean: 0.03 });
  }, 101);
  const mid = levelCanvas((g, rng) => {
    strokes(g, rng, { angle: V, spacing: 17, width: PEN * 0.9, segMin: 120, segMax: 600, fill: 0.7, jitter: 0.3, lean: 0.02 });
  }, 102);
  const dark = levelCanvas((g, rng) => {
    strokes(g, rng, { angle: V, spacing: 14, width: PEN, segMin: 200, segMax: 800, fill: 0.86, jitter: 0.25, lean: 0.02 });
    strokes(g, rng, { angle: 0.12, spacing: 15, width: PEN * 0.95, segMin: 200, segMax: 800, fill: 0.8, jitter: 0.3, lean: 0.03 });
  }, 103);
  const darkest = levelCanvas((g, rng) => {
    strokes(g, rng, { angle: V, spacing: 6, width: PEN * 1.3, segMin: 400, segMax: 1000, fill: 0.97, jitter: 0.15, lean: 0.01 });
    strokes(g, rng, { angle: 0.1, spacing: 7, width: PEN * 1.2, segMin: 400, segMax: 1000, fill: 0.95, jitter: 0.2, lean: 0.015 });
    strokes(g, rng, { angle: Math.PI / 4, spacing: 8, width: PEN * 1.1, segMin: 400, segMax: 1000, fill: 0.9, jitter: 0.2, lean: 0.02 });
  }, 104);
  return packLevels([light, mid, dark, darkest]);
}

export function makeFloorTiles() {
  const light = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 34, width: PEN * 0.9, len: 70, fill: 0.3 });
  }, 201);
  const mid = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 17, width: PEN, len: 110, fill: 0.62 });
  }, 202);
  const dark = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 15, width: PEN, len: 160, fill: 0.8 });
    strokes(g, rng, { angle: Math.PI / 2 + 0.1, spacing: 16, width: PEN * 0.95, segMin: 200, segMax: 700, fill: 0.78, jitter: 0.3 });
  }, 203);
  const darkest = levelCanvas((g, rng) => {
    dashRows(g, rng, { spacing: 6, width: PEN * 1.3, len: 400, fill: 0.97 });
    strokes(g, rng, { angle: Math.PI / 2 + 0.06, spacing: 7, width: PEN * 1.2, segMin: 400, segMax: 1000, fill: 0.95, jitter: 0.2 });
    strokes(g, rng, { angle: -Math.PI / 4, spacing: 8, width: PEN * 1.1, segMin: 400, segMax: 1000, fill: 0.9, jitter: 0.2 });
  }, 204);
  return packLevels([light, mid, dark, darkest]);
}

// Paper grain around 1.0 (a multiplier), no vignette, no soft mottling: the paper is flat.
export function makePaperGrain(size = 512) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  paper(g, size, size, '#ffffff', { grain: 0.075, seed: 17 });
  // a scatter of tiny fibres, the way laid paper catches the pen
  const rng = mulberry32(23);
  g.strokeStyle = 'rgba(0,0,0,0.055)';
  g.lineWidth = 1;
  for (let i = 0; i < 700; i++) {
    const x = rng() * size, y = rng() * size, a = rng() * Math.PI, l = 2 + rng() * 5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}
