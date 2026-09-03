// Hand-drawn ink helpers. Everything in this world is drawn with a pen on paper: lines wobble a
// little, tone is built from hatching strokes (never gradients), fills are flat. These helpers
// draw onto 2D canvases that become textures, so wallpaper, floorboards, card backs, signage and
// labels all share one hand.
import * as THREE from 'three';
import { mulberry32 } from './rng.js';

export const INK = '#1c1a17';
export const PAPER = '#f6f2ea';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function canvasTexture(canvas, { repeat = null, srgb = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Draw onto a fresh canvas and return a texture. draw(ctx2d, w, h, rng)
export function drawTexture(w, h, draw, opts = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  draw(g, w, h, mulberry32(opts.seed ?? 7));
  return canvasTexture(c, opts);
}

export function paper(g, w, h, tint = PAPER, { grain = 0.035, seed = 3 } = {}) {
  g.fillStyle = tint;
  g.fillRect(0, 0, w, h);
  if (grain > 0) {
    const rng = mulberry32(seed);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * 255 * grain;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n * 0.9;
    }
    g.putImageData(img, 0, 0);
  }
}

// A wobbly pen line. width in px; wobble in px; rng for reproducibility.
export function inkLine(g, x1, y1, x2, y2, { width = 2, wobble = 0.8, rng = Math.random, color = INK, alpha = 1, segments = null } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = segments ?? Math.max(2, Math.round(len / 6));
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const nx = -(y2 - y1) / (len || 1);
    const ny = (x2 - x1) / (len || 1);
    const off = (rng() - 0.5) * 2 * wobble * (i === 0 || i === n ? 0.3 : 1);
    const px = x1 + (x2 - x1) * u + nx * off;
    const py = y1 + (y2 - y1) * u + ny * off;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  // pressure: slightly thicker in the middle
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.stroke();
  g.restore();
}

// Wobbly rectangle outline (drawn as four separate strokes with tiny overshoots, like a pen).
export function inkRect(g, x, y, w, h, opts = {}) {
  const o = opts.overshoot ?? 2;
  const rng = opts.rng ?? Math.random;
  inkLine(g, x - o * rng(), y, x + w + o * rng(), y, opts);
  inkLine(g, x + w, y - o * rng(), x + w, y + h + o * rng(), opts);
  inkLine(g, x + w + o * rng(), y + h, x - o * rng(), y + h, opts);
  inkLine(g, x, y + h + o * rng(), x, y - o * rng(), opts);
}

// Parallel hatching strokes inside a rect. angle in radians (0 = horizontal, PI/2 = vertical).
// density 0..1 controls spacing; `broken` > 0 leaves gaps so it reads as pen strokes, not a grid.
export function hatch(g, x, y, w, h, { angle = Math.PI / 2, spacing = 6, width = 1.2, wobble = 0.6, broken = 0.25, rng = Math.random, color = INK, alpha = 0.9, jitter = 1.5 } = {}) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  const diag = Math.hypot(w, h);
  const cx = x + w / 2, cy = y + h / 2;
  const dx = Math.cos(angle), dy = Math.sin(angle); // stroke direction
  const nx = -dy, ny = dx; // normal
  const count = Math.ceil(diag / spacing);
  for (let i = -count; i <= count; i++) {
    const d = i * spacing + (rng() - 0.5) * jitter;
    const mx = cx + nx * d, my = cy + ny * d;
    // stroke from one side to the other, optionally broken into pieces
    let s = -diag / 2;
    while (s < diag / 2) {
      const segLen = broken > 0 ? diag * (0.25 + rng() * 0.6) : diag;
      const e = Math.min(diag / 2, s + segLen);
      inkLine(g, mx + dx * s, my + dy * s, mx + dx * e, my + dy * e, { width, wobble, rng, color, alpha });
      s = e + (broken > 0 ? spacing * (0.5 + rng() * 3) * broken : 0);
    }
  }
  g.restore();
}

// Cross-hatch = two hatch passes.
export function crossHatch(g, x, y, w, h, opts = {}) {
  hatch(g, x, y, w, h, { ...opts, angle: (opts.angle ?? Math.PI / 4) });
  hatch(g, x, y, w, h, { ...opts, angle: (opts.angle ?? Math.PI / 4) + Math.PI / 2, alpha: (opts.alpha ?? 0.9) * 0.8 });
}

// Short dash strokes scattered in a rect (cobbles, floor texture).
export function dashes(g, x, y, w, h, { count = 400, len = 10, width = 1.4, angle = 0, angleJitter = 0.25, rng = Math.random, color = INK, alpha = 0.85 } = {}) {
  for (let i = 0; i < count; i++) {
    const px = x + rng() * w, py = y + rng() * h;
    const a = angle + (rng() - 0.5) * 2 * angleJitter;
    const l = len * (0.5 + rng());
    inkLine(g, px, py, px + Math.cos(a) * l, py + Math.sin(a) * l, { width, wobble: 0.4, rng, color, alpha });
  }
}

// Hand lettering: Futura-ish capitals with a little per-letter jitter, like a painted shop sign.
export function letter(g, text, x, y, { size = 48, color = INK, rng = Math.random, tracking = 0.08, jitter = 1.2, weight = 600, family = "'Futura', 'Jost', sans-serif", align = 'center' } = {}) {
  g.save();
  g.fillStyle = color;
  g.font = `${weight} ${size}px ${family}`;
  g.textBaseline = 'middle';
  const widths = [...text].map((ch) => g.measureText(ch).width + size * tracking);
  const total = widths.reduce((a, b) => a + b, 0) - size * tracking;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  [...text].forEach((ch, i) => {
    g.fillText(ch, cx + (rng() - 0.5) * jitter, y + (rng() - 0.5) * jitter);
    cx += widths[i];
  });
  g.restore();
}

// Shared flat material for ink-world surfaces: white paper that the ink pass will draw over.
// `color` may be a hex for selective-colour objects (Pepe, the cards). `hatch` 0..1 asks the ink
// pass for more tone; `lineWeight` scales outlines. These are read via userData by the ink piece.
export function inkMaterial({ color = PAPER, map = null, hatch = 0.5, lineWeight = 1, colorful = false, roughness = 0.9, side = THREE.FrontSide, transparent = false, opacity = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, map, roughness, metalness: 0, side, transparent, opacity });
  m.userData.ink = { hatch, lineWeight, colorful };
  return m;
}
