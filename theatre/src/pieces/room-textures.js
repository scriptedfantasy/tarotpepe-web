// room-textures — the PATTERNS the parlour is made of, drawn with a pen on paper: a sparse
// wallpaper motif in loose rows, a Greek-key frieze, tongue-and-groove wainscot, floorboards,
// wood grain. Pattern only: no shading, no object outlines (the ink pass draws tone and edges
// where the geometry has them). Every texture is drawn at a fixed physical size (metres per
// tile) so surfaces can share one hand: meshes map their UVs in world metres and the texture
// repeats. The pen here is deliberately fat (5–7 px at 1000 ppm ≈ 6 mm): at the wide shot the
// back wall is ~200 px/m, so a 6 mm stroke lands at ~1.2 px — the same weight the ink pass
// draws its outlines with. A finer pen mip-blends into a grey screen.
import * as THREE from 'three';
import { INK, PAPER, drawTexture, paper, inkLine, hatch } from '../core/strokes.js';

const px = (m, ppm) => m * ppm;

// A small pen stroke path with wobble (for motifs). pts in px, drawn in the current transform.
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

// A smooth pen curve through points (Catmull-Rom → bezier), with a little wobble per knot.
function penCurve(g, pts, { width = 3, wobble = 1.2, rng = Math.random, alpha = 0.8, color = INK } = {}) {
  const p = pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * wobble, y + (rng() - 0.5) * 2 * wobble]);
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.beginPath();
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  g.stroke();
  g.restore();
}

function ring(g, x, y, r, { rng = Math.random, alpha = 0.85, color = INK, width = 3 } = {}) {
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.lineCap = 'round';
  g.beginPath();
  // an open circle, the way a pen draws one: starts and ends a few degrees apart
  const a0 = rng() * Math.PI * 2, span = Math.PI * 2 * (0.9 + rng() * 0.12);
  const rx = r * (0.92 + rng() * 0.16), ry = r * (0.92 + rng() * 0.16);
  g.ellipse(x + (rng() - 0.5), y + (rng() - 0.5), rx, ry, rng() * Math.PI, a0, a0 + span);
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

// The wallpaper motif: a sprig — a bent stem, three leaves each drawn as two strokes, a cluster of
// three berries at the tip. Drawn in local coords, stem base at (0, +s/2), tip at (0, -s/2).
// Each call is a fresh hand: the leaf angles, the stem bend and the pen weight all vary.
function sprig(g, s, rng, { alpha = 0.8, width = 5 } = {}) {
  const w = width * (0.85 + rng() * 0.3);
  const o = { width: w, wobble: s * 0.01, rng, alpha };
  const bend = (rng() - 0.5) * s * 0.2;
  // stem: a gentle S, base at the bottom, tip near the top
  const stem = (t) => [bend * Math.sin(t * Math.PI), s * (0.5 - t * 0.9)]; // t 0..1 → base..tip
  penCurve(g, [stem(0), stem(0.3), stem(0.6), stem(1)], o);
  // leaves: five, alternating sides, each one closed loop drawn as a single stroke (a pointed
  // ellipse), with a faint midrib in most
  const n = 4 + (rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const t = 0.16 + (i / n) * 0.7;
    const side = i % 2 ? 1 : -1;
    const [bx, by] = stem(t);
    const tilt = -Math.PI / 2 + side * (1.05 + (rng() - 0.5) * 0.4) - (1 - t) * 0.2 * side; // lower leaves droop more
    const L = s * (0.3 + rng() * 0.08) * (1 - t * 0.35);
    const tx = bx + Math.cos(tilt) * L, ty = by + Math.sin(tilt) * L;
    const nx = -Math.sin(tilt) * L * 0.28, ny = Math.cos(tilt) * L * 0.28;
    const mx = (bx + tx) / 2, my = (by + ty) / 2;
    penCurve(g, [[bx, by], [mx + nx * 0.9, my + ny * 0.9], [tx, ty], [mx - nx * 0.9, my - ny * 0.9], [bx, by]], { ...o, width: w * 0.9 });
    if (rng() < 0.75) penCurve(g, [[bx, by], [mx, my], [bx + (tx - bx) * 0.8, by + (ty - by) * 0.8]], { ...o, width: w * 0.55, alpha: alpha * 0.6 });
  }
  // a cluster of three berries at the tip, one filled
  const [tipx, tipy] = stem(1);
  const r = s * 0.05;
  ring(g, tipx - r * 1.5, tipy - r * 0.5, r, { rng, alpha, width: w * 0.9 });
  ring(g, tipx + r * 1.5, tipy - r * 0.3, r, { rng, alpha, width: w * 0.9 });
  ring(g, tipx, tipy - r * 2.1, r, { rng, alpha, width: w * 0.9 });
  const which = Math.floor(rng() * 3);
  const bx = [tipx - r * 1.5, tipx + r * 1.5, tipx][which], by = [tipy - r * 0.5, tipy - r * 0.3, tipy - r * 2.1][which];
  dot(g, bx, by, r * 0.6, { rng, alpha });
}

// Wallpaper: one motif in loose offset rows on bare paper. Tile 1.02 m; three motifs across
// (pitch 0.34 m), three rows up, every second row shifted half a pitch; each instance is drawn
// separately with its own drift, tilt and pen weight, and one in ten is missing or faded, so the
// rows visibly wander. Everything between motifs is untouched paper.
export function wallpaperTexture({ tile = 1.02, ppm = 1000, seed = 21 } = {}) {
  const size = Math.round(tile * ppm);
  const cols = 3, rows = 3;
  const a = size / cols, b = size / rows;
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng0) => {
      paper(g, w, h, PAPER, { grain: 0.012, seed });
      const s = px(0.15, ppm); // motif height
      // instances (with wrap copies so the tile is seamless: the same hand for each copy)
      for (let j = -1; j <= rows; j++)
        for (let i = -1; i <= cols; i++) {
          const jj = ((j % rows) + rows) % rows, ii = ((i % cols) + cols) % cols;
          const rng = rng0.fork(1000 + jj * 17 + ii * 3);
          const fate = rng();
          if (fate < 0.07) continue; // the paper-hanger's blank
          const alpha = fate < 0.16 ? 0.4 : 0.8; // a faded print now and then
          const cx = a / 2 + i * a + (j % 2 ? a / 2 : 0) + (rng() - 0.5) * 12;
          const cy = b / 2 + j * b + (rng() - 0.5) * 12;
          const rot = (rng() - 0.5) * 0.21; // ±6°
          g.save();
          g.translate(cx, cy);
          g.rotate(rot);
          sprig(g, s * (0.92 + rng() * 0.16), rng, { alpha, width: 5.2 });
          g.restore();
        }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Frieze: a Greek key meander over a base line, along the picture rail. Tile 0.68 m holds four
// units whose widths differ by ±10%; every corner is left open by a few px; no rules (the rail
// and cornice above and below give the band its edges). The band is `height` m tall starting at
// y0; the texture's repeat/offset are set so the canvas spans exactly that band.
export function friezeTexture({ tile = 0.68, ppm = 1000, seed = 31, y0: bandY0 = 2.64, height = 0.34 } = {}) {
  const size = Math.round(tile * ppm);
  const bandH = Math.round(height * ppm);
  const tex = drawTexture(
    size,
    bandH,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0.012, seed });
      const units = 4;
      const widths = [];
      for (let i = 0; i < units; i++) widths.push(0.9 + rng() * 0.2);
      const sum = widths.reduce((p, q) => p + q, 0);
      const y0 = h * 0.74, y1 = h * 0.26;
      const kh = y0 - y1;
      const lw = 6;
      const o = { width: lw, wobble: 1.6, rng, alpha: 0.82 };
      // a segment of the key, drawn as its own pen stroke with open corners
      const seg = (ax, ay, bx, by) => {
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
        const gap = 2.5 + rng() * 1.5;
        const ux = dx / L, uy = dy / L;
        inkLine(g, ax + ux * gap, ay + uy * gap, bx - ux * gap * 0.4, by - uy * gap * 0.4, { ...o, width: lw * (0.9 + rng() * 0.2), segments: Math.max(3, Math.round(L / 14)) });
      };
      // base line: one long stroke, broken once
      const brk = w * (0.3 + rng() * 0.4);
      inkLine(g, -4, y0, brk - 6, y0 + (rng() - 0.5) * 3, { ...o, segments: 30 });
      inkLine(g, brk + 4, y0 + (rng() - 0.5) * 3, w + 4, y0, { ...o, segments: 30 });
      let x0 = 0;
      for (let i = 0; i < units; i++) {
        const u = (w * widths[i]) / sum;
        const P = (fx, fy) => [x0 + fx * u + (rng() - 0.5) * 2, y0 - fy * kh + (rng() - 0.5) * 2];
        const pts = [P(0.86, 0), P(0.86, 0.84), P(0.14, 0.84), P(0.14, 0.26), P(0.6, 0.26), P(0.6, 0.58), P(0.38, 0.58)];
        for (let k = 0; k < pts.length - 1; k++) seg(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
        x0 += u;
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  // v runs in metres / tile; stretch it so one canvas height is one band, and shift so the band's
  // foot lands on v = 0
  const ry = tile / height;
  const v0 = bandY0 / height;
  tex.repeat.set(1, ry);
  tex.offset.set(0, -(v0 - Math.floor(v0)));
  return tex;
}

// Wainscot: tongue-and-groove boards, roughly 0.1 m wide but no two alike — a seam for each,
// a bead beside most, the odd seam doubled where the pen went twice. Tile 0.8 m, eight boards.
export function wainscotTexture({ tile = 0.8, ppm = 1000, seed = 41 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0.012, seed });
      const boards = 8;
      const widths = [];
      for (let i = 0; i < boards; i++) widths.push(0.82 + rng() * 0.36);
      const sum = widths.reduce((p, q) => p + q, 0);
      let x = 0;
      for (let i = 0; i < boards; i++) {
        const bw = (w * widths[i]) / sum;
        const lean = (rng() - 0.5) * 6;
        inkLine(g, x, -4, x + lean, h + 4, { width: 6, wobble: 2.6, rng, alpha: 0.9, segments: 26 });
        if (rng() < 0.22) inkLine(g, x + 5, -4, x + 5 + lean, h + 4, { width: 4, wobble: 2.2, rng, alpha: 0.6, segments: 26 });
        if (rng() < 0.7) inkLine(g, x + 13, -4, x + 13 + lean * 0.8, h + 4, { width: 3, wobble: 1.8, rng, alpha: 0.32, segments: 26 });
        // faint grain: a long broken line or two per board
        if (rng() < 0.8) hatch(g, x + 22, 0, bw - 30, h, { angle: Math.PI / 2, spacing: 34, width: 2.2, wobble: 2.2, broken: 0.9, rng, alpha: 0.13, jitter: 12 });
        x += bw;
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Floorboards running left–right (parallel to the back wall): long wobbly seams that read from
// across the room, an end joint every 0.9–1.7 m, a knot now and then drawn as a small loop with
// the grain bending round it, and a little long broken grain. Everything that crosses the tile
// edge is drawn again one tile over so the floor is seamless.
export function floorTexture({ tile = 2.5, ppm = 800, seed = 51, board = 0.2 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, '#f4efe5', { grain: 0.012, seed });
      const rows = Math.round(h / px(board, ppm));
      const rowH = h / rows;
      const wrapX = (fn) => {
        for (const dx of [-w, 0, w]) {
          g.save();
          g.translate(dx, 0);
          fn();
          g.restore();
        }
      };
      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        // seam: one long stroke, sometimes lifted for a few cm where the pen skipped
        const seamRng = rng.fork(300 + r);
        wrapX(() => inkLine(g, -8, y, w + 8, y, { width: 8, wobble: 3.6, rng: seamRng.fork(1), alpha: 0.95, segments: 90 }));
        // end joints: board lengths 0.9–1.7 m, staggered per row
        let x = -rng() * px(1.2, ppm);
        const joints = [];
        while (x < w) {
          x += px(0.9 + rng() * 0.8, ppm);
          if (x > 0 && x < w) joints.push(x);
        }
        for (const jx of joints) {
          const jr = rng.fork(500 + r * 31 + Math.round(jx));
          wrapX(() => inkLine(g, jx, y + 3, jx + (jr() - 0.5) * 4, y + rowH - 3, { width: 7.5, wobble: 1.8, rng: jr.fork(2), alpha: 0.95, segments: 8 }));
        }
        // grain: two or three long thin broken lines along the board
        const nGrain = 2 + Math.floor(rng() * 2);
        for (let k = 0; k < nGrain; k++) {
          const gy = y + rowH * (0.18 + rng() * 0.64);
          let gx = rng() * w * 0.5;
          while (gx < w) {
            const len = px(0.3 + rng() * 0.9, ppm);
            const gr = rng.fork(700 + r * 97 + Math.round(gx));
            const yy = gy + (rng() - 0.5) * rowH * 0.1;
            wrapX(() => inkLine(g, gx, yy, gx + len, yy + (gr() - 0.5) * 6, { width: 3, wobble: 2.2, rng: gr.fork(3), alpha: 0.32, segments: Math.round(len / 40) }));
            gx += len + px(0.2 + rng() * 0.8, ppm);
          }
        }
      }
      // knots: three per tile, a loop inside a loop, the grain swelling round them
      for (let k = 0; k < 3; k++) {
        const kx = rng() * w, r = Math.floor(rng() * rows), ky = r * rowH + rowH * (0.35 + rng() * 0.3);
        const kr = rng.fork(900 + k);
        const rx = px(0.028, ppm), ry = px(0.014, ppm);
        wrapX(() => {
          ring(g, kx, ky, rx, { rng: kr.fork(1), alpha: 0.9, width: 5 });
          g.save();
          g.scale(1, ry / rx);
          ring(g, kx, (ky * rx) / ry, rx * 0.45, { rng: kr.fork(2), alpha: 0.9, width: 4 });
          g.restore();
          // grain bending around the knot: two arcs above and below
          for (const sgn of [-1, 1]) {
            penCurve(g, [[kx - rx * 2.6, ky + sgn * ry * 1.9], [kx - rx * 1.2, ky + sgn * ry * 2.4], [kx, ky + sgn * ry * 2.7], [kx + rx * 1.2, ky + sgn * ry * 2.4], [kx + rx * 2.6, ky + sgn * ry * 1.9]], { width: 3.2, wobble: 1.2, rng: kr.fork(3 + sgn), alpha: 0.5 });
          }
        });
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
      hatch(g, 0, 0, w, h, { angle: Math.PI / 2, spacing: 40, width: 4.2, wobble: 2.6, broken: 0.8, rng, alpha: alpha * 0.85, jitter: 12 });
      hatch(g, 0, 0, w, h, { angle: Math.PI / 2, spacing: 76, width: 2.6, wobble: 3.8, broken: 0.9, rng, alpha: alpha * 0.5, jitter: 20 });
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
