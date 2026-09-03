// room-textures — the PATTERNS the parlour is made of, drawn with a pen on paper: wallpaper
// motif, a Greek-key frieze, tongue-and-groove wainscot, floorboards, wood grain. Pattern only:
// no shading, no object outlines (the ink pass draws tone and edges where the geometry has them).
// Every texture is drawn at a fixed physical size (metres per tile) so surfaces can share one
// hand: meshes map their UVs in world metres and the texture repeats.
import * as THREE from 'three';
import { INK, PAPER, drawTexture, paper, inkLine, hatch, dashes } from '../core/strokes.js';

const px = (m, ppm) => m * ppm;

// A small pen stroke path with wobble (for motifs). pts in px.
function penPath(g, pts, { width = 3, wobble = 1.2, rng = Math.random, alpha = 0.8, color = INK, close = false } = {}) {
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = x + (rng() - 0.5) * 2 * wobble, jy = y + (rng() - 0.5) * 2 * wobble;
    if (i === 0) g.moveTo(jx, jy);
    else g.lineTo(jx, jy);
  });
  if (close) g.closePath();
  g.stroke();
  g.restore();
}

function dot(g, x, y, r, { rng = Math.random, alpha = 0.85, color = INK } = {}) {
  g.save();
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.beginPath();
  g.ellipse(x + (rng() - 0.5), y + (rng() - 0.5), r * (0.9 + rng() * 0.2), r * (0.9 + rng() * 0.2), rng() * Math.PI, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// A sprig: a curved stem with two leaves and a bud. size in px.
function sprig(g, cx, cy, s, rng, alpha = 0.85) {
  const w = 3.2;
  // stem, slightly bent
  penPath(g, [[cx - s * 0.05, cy + s * 0.5], [cx + s * 0.02, cy + s * 0.15], [cx + s * 0.06, cy - s * 0.2], [cx, cy - s * 0.5]], { width: w, wobble: 1, rng, alpha });
  // left leaf
  penPath(g, [[cx + s * 0.02, cy + s * 0.12], [cx - s * 0.22, cy + s * 0.02], [cx - s * 0.34, cy - s * 0.18], [cx - s * 0.16, cy - s * 0.16], [cx + s * 0.03, cy - s * 0.02]], { width: w * 0.85, wobble: 1, rng, alpha });
  // right leaf
  penPath(g, [[cx + s * 0.05, cy - s * 0.05], [cx + s * 0.26, cy - s * 0.12], [cx + s * 0.36, cy - s * 0.32], [cx + s * 0.18, cy - s * 0.3], [cx + s * 0.06, cy - s * 0.18]], { width: w * 0.85, wobble: 1, rng, alpha });
  // bud: three dots
  dot(g, cx - s * 0.1, cy - s * 0.58, s * 0.06, { rng, alpha });
  dot(g, cx + s * 0.1, cy - s * 0.6, s * 0.06, { rng, alpha });
  dot(g, cx, cy - s * 0.7, s * 0.065, { rng, alpha });
}

// A little fleur-de-lis, simplified to read at 20px: centre petal, two curls, a band.
function fleur(g, cx, cy, s, rng, alpha = 0.85) {
  const w = 3;
  penPath(g, [[cx, cy + s * 0.45], [cx, cy - s * 0.5]], { width: w * 1.2, wobble: 0.8, rng, alpha });
  penPath(g, [[cx - s * 0.05, cy - s * 0.05], [cx - s * 0.3, cy - s * 0.25], [cx - s * 0.36, cy + s * 0.02], [cx - s * 0.2, cy + s * 0.12]], { width: w, wobble: 0.9, rng, alpha });
  penPath(g, [[cx + s * 0.05, cy - s * 0.05], [cx + s * 0.3, cy - s * 0.25], [cx + s * 0.36, cy + s * 0.02], [cx + s * 0.2, cy + s * 0.12]], { width: w, wobble: 0.9, rng, alpha });
  penPath(g, [[cx - s * 0.22, cy + s * 0.2], [cx + s * 0.22, cy + s * 0.2]], { width: w, wobble: 0.8, rng, alpha });
  dot(g, cx, cy - s * 0.58, s * 0.07, { rng, alpha });
}

// Wallpaper: a diamond trellis with a sprig in one run of lozenges and a fleur-de-lis in the
// other. Tile = 1.02 m (6 lozenges across, 4 up). Lines lighter than object ink.
export function wallpaperTexture({ tile = 1.02, ppm = 1000, seed = 21 } = {}) {
  const size = Math.round(tile * ppm);
  const a = size / 6, b = size / 4; // lozenge width, height
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0.012, seed });
      const k = b / a;
      // trellis: two families of lines, periodic in the tile
      for (let j = -6; j <= 6; j++) {
        // family 1: y = k x + j b  → from x=0 to x=w
        inkLine(g, 0, j * b, w, k * w + j * b, { width: 3.4, wobble: 1.8, rng, alpha: 0.36, segments: 40 });
        // family 2: y = -k x + j b
        inkLine(g, 0, j * b, w, -k * w + j * b, { width: 3.4, wobble: 1.8, rng, alpha: 0.36, segments: 40 });
      }
      // motifs at lozenge centres: (a/2 + i a, j b) → sprig; (i a, b/2 + j b) → fleur
      const s = a * 0.7;
      for (let i = -1; i <= 6; i++)
        for (let j = -1; j <= 4; j++) {
          sprig(g, a / 2 + i * a, j * b, s, rng, 0.72);
          fleur(g, i * a, b / 2 + j * b, s * 0.85, rng, 0.72);
        }
      // a few tiny pen ticks where the trellis crosses: the printer's registration dots
      for (let i = 0; i <= 6; i++)
        for (let j = 0; j <= 4; j++) dot(g, i * a, j * b, 3.2, { rng, alpha: 0.6 });
    },
    { seed, repeat: [1, 1] },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Frieze: a Greek key meander between two rules, running along the picture rail.
export function friezeTexture({ tile = 0.34, ppm = 1200, seed = 31 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0.012, seed });
      const units = 2;
      const u = w / units;
      const y0 = h * 0.72, y1 = h * 0.28; // key band (canvas y grows downward; texture v flips)
      const bandH = y0 - y1;
      const lw = 4.2;
      const o = { width: lw, wobble: 1.4, rng, alpha: 0.8 };
      // rules
      inkLine(g, 0, h * 0.2, w, h * 0.2, { ...o, width: 3.4, alpha: 0.7, segments: 30 });
      inkLine(g, 0, h * 0.8, w, h * 0.8, { ...o, width: 3.4, alpha: 0.7, segments: 30 });
      // continuous base line of the key
      inkLine(g, 0, y0, w, y0, { ...o, segments: 30 });
      for (let i = 0; i < units; i++) {
        const x0 = i * u;
        const P = (fx, fy) => [x0 + fx * u, y0 - fy * bandH];
        penPath(g, [P(0.86, 0), P(0.86, 0.84), P(0.14, 0.84), P(0.14, 0.26), P(0.6, 0.26), P(0.6, 0.58), P(0.38, 0.58)], { ...o, wobble: 1.6 });
      }
      // small dots between the rules and the band edges, every half unit
      for (let i = 0; i < units * 2; i++) {
        dot(g, (i + 0.5) * (u / 2), h * 0.11, 3.5, { rng, alpha: 0.6 });
        dot(g, (i + 0.5) * (u / 2), h * 0.89, 3.5, { rng, alpha: 0.6 });
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Wainscot: tongue-and-groove boards, a seam and a bead every 0.1 m.
export function wainscotTexture({ tile = 0.4, ppm = 1000, seed = 41 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0.012, seed });
      const boards = 4;
      const bw = w / boards;
      for (let i = 0; i < boards; i++) {
        const x = i * bw;
        inkLine(g, x, -4, x, h + 4, { width: 4, wobble: 2, rng, alpha: 0.85, segments: 26 });
        inkLine(g, x + 11, -4, x + 11, h + 4, { width: 2.6, wobble: 1.4, rng, alpha: 0.4, segments: 26 });
        // faint grain
        hatch(g, x + 18, 0, bw - 24, h, { angle: Math.PI / 2, spacing: 26, width: 1.8, wobble: 1.6, broken: 0.85, rng, alpha: 0.16, jitter: 9 });
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Floorboards running left–right (parallel to the back wall): seams with a wobble, staggered
// end joints, a pair of nail dots at each joint, grain as dash strokes, the odd knot.
export function floorTexture({ tile = 2.5, ppm = 800, seed = 51, board = 0.14 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, '#f4efe5', { grain: 0.012, seed });
      const bh = px(board, ppm);
      const rows = Math.round(h / bh);
      const rowH = h / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        // seam
        inkLine(g, -6, y, w + 6, y, { width: 5.5, wobble: 2.8, rng, alpha: 1, segments: 70 });
        // end joints: board lengths 0.9–1.7 m, staggered per row
        let x = -rng() * px(1.2, ppm);
        const joints = [];
        while (x < w) {
          x += px(0.9 + rng() * 0.8, ppm);
          if (x > 0 && x < w) joints.push(x);
        }
        for (const jx of joints) {
          inkLine(g, jx, y + 2, jx, y + rowH - 2, { width: 4.6, wobble: 1.4, rng, alpha: 1, segments: 8 });
          dot(g, jx - 16, y + rowH * 0.3, 3.2, { rng, alpha: 0.7 });
          dot(g, jx - 16, y + rowH * 0.7, 3.2, { rng, alpha: 0.7 });
          dot(g, jx + 16, y + rowH * 0.3, 3.2, { rng, alpha: 0.7 });
          dot(g, jx + 16, y + rowH * 0.7, 3.2, { rng, alpha: 0.7 });
        }
        // grain: short dashes along the board, denser near the seams
        dashes(g, 0, y + 6, w, rowH - 12, { count: 190, len: px(0.11, ppm), width: 2.6, angle: 0, angleJitter: 0.03, rng, alpha: 0.5 });
        dashes(g, 0, y + rowH * 0.15, w, rowH * 0.12, { count: 40, len: px(0.16, ppm), width: 2.2, angle: 0, angleJitter: 0.02, rng, alpha: 0.35 });
        // a knot now and then
        if (rng() < 0.45) {
          const kx = rng() * w, ky = y + rowH * (0.3 + rng() * 0.4);
          g.save();
          g.strokeStyle = INK;
          g.globalAlpha = 0.55;
          g.lineWidth = 2.6;
          g.beginPath();
          g.ellipse(kx, ky, px(0.02, ppm), px(0.011, ppm), 0, 0, Math.PI * 2);
          g.stroke();
          g.beginPath();
          g.ellipse(kx + 2, ky - 1, px(0.009, ppm), px(0.005, ppm), 0.3, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Wood grain for the door and shutters: long broken vertical strokes, the way the film draws a
// plank door. Tile 0.25 m.
export function grainTexture({ tile = 0.25, ppm = 1536, seed = 61, alpha = 0.7 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0.012, seed });
      hatch(g, 0, 0, w, h, { angle: Math.PI / 2, spacing: 36, width: 3.4, wobble: 2.4, broken: 0.8, rng, alpha, jitter: 12 });
      hatch(g, 0, 0, w, h, { angle: Math.PI / 2, spacing: 70, width: 2, wobble: 3.5, broken: 0.9, rng, alpha: alpha * 0.6, jitter: 20 });
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Plain paper (ceiling, glass, painted trim).
export function plainTexture({ tint = PAPER, seed = 71 } = {}) {
  const tex = drawTexture(256, 256, (g, w, h) => paper(g, w, h, tint, { grain: 0.01, seed }), { seed });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = 0.5;
  return tex;
}
