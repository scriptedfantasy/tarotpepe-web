// table-textures — the drawn PATTERNS of the things on the table (what they are made of, what is
// printed or stitched on them). No shading, no outlines: the ink pass draws those.
import * as THREE from 'three';
import { drawTexture, paper, inkLine, inkRect, hatch, crossHatch, letter, INK } from '../core/strokes.js';

// a wobbly circle drawn as short pen segments
function inkCircle(g, cx, cy, r, { width = 1.6, wobble = 1, rng = Math.random, alpha = 1, color = INK, gaps = 0 } = {}) {
  const n = Math.max(24, Math.round(r / 5));
  let skipping = false;
  for (let i = 0; i < n; i++) {
    if (gaps > 0) {
      if (skipping) {
        skipping = rng() > 0.4;
        continue;
      }
      if (rng() < gaps) {
        skipping = true;
        continue;
      }
    }
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1.15) / n) * Math.PI * 2;
    inkLine(g, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, { width, wobble, rng, alpha, color, segments: 2 });
  }
}

// small embroidered motif: a diamond with a dot, alternating with a little cross
function motif(g, x, y, s, kind, rng) {
  const o = { width: 1.5, wobble: 0.5, rng, segments: 2 };
  if (kind === 0) {
    inkLine(g, x, y - s, x + s, y, o);
    inkLine(g, x + s, y, x, y + s, o);
    inkLine(g, x, y + s, x - s, y, o);
    inkLine(g, x - s, y, x, y - s, o);
    g.fillStyle = INK;
    g.beginPath();
    g.arc(x, y, s * 0.22, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 1) {
    inkLine(g, x - s * 0.7, y - s * 0.7, x + s * 0.7, y + s * 0.7, o);
    inkLine(g, x + s * 0.7, y - s * 0.7, x - s * 0.7, y + s * 0.7, o);
  } else {
    // a tiny flower: five petals as short strokes from a dot
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rng() * 0.3;
      inkLine(g, x + Math.cos(a) * s * 0.25, y + Math.sin(a) * s * 0.25, x + Math.cos(a) * s, y + Math.sin(a) * s, o);
    }
    g.fillStyle = INK;
    g.beginPath();
    g.arc(x, y, s * 0.2, 0, Math.PI * 2);
    g.fill();
  }
}

// a running scallop (little arches) along a horizontal line between x0..x1 at y, arch width w
function scallop(g, x0, x1, y, w, h, rng, up = -1) {
  for (let x = x0; x < x1; x += w) {
    const n = 5;
    let px = x, py = y;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const nx = x + u * w, ny = y + up * Math.sin(u * Math.PI) * h;
      inkLine(g, px, py, nx, ny, { width: 1.3, wobble: 0.4, rng, segments: 2 });
      px = nx;
      py = ny;
    }
  }
}

// ---------- the cloth's top: a centre medallion, a fine inner square with corner motifs ----------
export function clothTopTexture(R) {
  return drawTexture(
    1024,
    1024,
    (g, w, h, rng) => {
      paper(g, w, h, '#f7f3eb', { grain: 0.03, seed: 21 });
      const c = w / 2;
      const pxm = w / (2 * R); // px per metre
      sprigs(g, w, h, pxm, rng, { offset: 17 });
      // keep the medallion's ground clear
      g.fillStyle = '#f7f3eb';
      g.beginPath();
      g.arc(c, c, 0.125 * pxm, 0, Math.PI * 2);
      g.fill();
      // the square cloth's inner border line, 0.5 m from centre (runs off the round top)
      const sq = 0.5 * pxm;
      const o = { width: 1.4, wobble: 1.1, rng, alpha: 0.85 };
      for (const d of [0, 9]) {
        const s = sq - d;
        inkLine(g, c - s, c - s, c + s, c - s, { ...o, width: d ? 1 : 1.6 });
        inkLine(g, c + s, c - s, c + s, c + s, { ...o, width: d ? 1 : 1.6 });
        inkLine(g, c + s, c + s, c - s, c + s, { ...o, width: d ? 1 : 1.6 });
        inkLine(g, c - s, c + s, c - s, c - s, { ...o, width: d ? 1 : 1.6 });
      }
      // little motifs along the inner square line (between the two lines)
      const step = 0.06 * pxm;
      for (let t = -sq + step; t < sq; t += step) {
        const k = Math.round((t + sq) / step) % 3;
        motif(g, c + t, c - sq + 4.5, 3.2, k, rng);
        motif(g, c + t, c + sq - 4.5, 3.2, k, rng);
        motif(g, c - sq + 4.5, c + t, 3.2, k, rng);
        motif(g, c + sq - 4.5, c + t, 3.2, k, rng);
      }
      // centre medallion: a compass star inside two rings with a scalloped edge
      const r1 = 0.075 * pxm, r2 = 0.095 * pxm, r3 = 0.115 * pxm;
      inkCircle(g, c, c, r1, { width: 1.5, wobble: 1.2, rng });
      inkCircle(g, c, c, r2, { width: 1.1, wobble: 1.0, rng });
      // scallops around the outer ring
      const nsc = 28;
      for (let i = 0; i < nsc; i++) {
        const a0 = (i / nsc) * Math.PI * 2, a1 = ((i + 1) / nsc) * Math.PI * 2;
        let px = c + Math.cos(a0) * r2, py = c + Math.sin(a0) * r2;
        for (let k = 1; k <= 5; k++) {
          const u = k / 5;
          const a = a0 + (a1 - a0) * u;
          const rr = r2 + Math.sin(u * Math.PI) * (r3 - r2);
          const nx = c + Math.cos(a) * rr, ny = c + Math.sin(a) * rr;
          inkLine(g, px, py, nx, ny, { width: 1.2, wobble: 0.5, rng, segments: 2 });
          px = nx;
          py = ny;
        }
      }
      // the star: 8 points, long and short
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const L = i % 2 === 0 ? r1 * 0.92 : r1 * 0.55;
        const bx = c + Math.cos(a) * L, by = c + Math.sin(a) * L;
        const wA = a + Math.PI / 2, ww = r1 * 0.09;
        const lx = c + Math.cos(wA) * ww, ly = c + Math.sin(wA) * ww;
        const rx = c - Math.cos(wA) * ww, ry = c - Math.sin(wA) * ww;
        inkLine(g, lx, ly, bx, by, { width: 1.5, wobble: 0.6, rng });
        inkLine(g, rx, ry, bx, by, { width: 1.5, wobble: 0.6, rng });
        // one half of each point hatched (the pattern of an embroidered star)
        g.save();
        g.beginPath();
        g.moveTo(c, c);
        g.lineTo(lx, ly);
        g.lineTo(bx, by);
        g.closePath();
        g.clip();
        hatch(g, c - r1, c - r1, r1 * 2, r1 * 2, { angle: a + 0.3, spacing: 4.5, width: 1, wobble: 0.3, broken: 0, rng, alpha: 0.9 });
        g.restore();
      }
      g.fillStyle = INK;
      g.beginPath();
      g.arc(c, c, 4, 0, Math.PI * 2);
      g.fill();
      // small motifs in a ring between the medallion and the square, at the four diagonals
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const rr = 0.2 * pxm;
        motif(g, c + Math.cos(a) * rr, c + Math.sin(a) * rr, 6, 2, rng);
      }
      // wear: two rings left by a glass and a cup (canvas x → world x, canvas y → world z, top = far)
      inkCircle(g, c + 0.37 * pxm, c - 0.17 * pxm, 0.034 * pxm, { width: 1.6, wobble: 1.2, rng, alpha: 0.45, gaps: 0.25 });
      inkCircle(g, c + 0.375 * pxm, c - 0.165 * pxm, 0.031 * pxm, { width: 1.0, wobble: 1.0, rng, alpha: 0.3, gaps: 0.4 });
      inkCircle(g, c - 0.14 * pxm, c - 0.2 * pxm, 0.03 * pxm, { width: 1.4, wobble: 1.1, rng, alpha: 0.4, gaps: 0.3 });
      // a few crumbs near the plate's place and a small burn from a cigarette by the ashtray
      for (let i = 0; i < 14; i++) {
        const x = c - 0.42 * pxm + (rng() - 0.5) * 0.16 * pxm, y = c + 0.04 * pxm + (rng() - 0.5) * 0.12 * pxm;
        inkLine(g, x, y, x + 2 + rng() * 3, y + (rng() - 0.5) * 2, { width: 1.6, wobble: 0.3, rng, alpha: 0.7, segments: 2 });
      }
      g.save();
      g.fillStyle = INK;
      g.globalAlpha = 0.55;
      g.beginPath();
      g.ellipse(c - 0.02 * pxm, c - 0.33 * pxm, 6, 3.5, 0.6, 0, Math.PI * 2);
      g.fill();
      g.restore();
    },
    { seed: 31 },
  );
}

// the cloth's all-over pattern: a sprig every 7 cm on a diagonal grid (light, so the cards read)
function sprigs(g, w, h, pxm, rng, { offset = 0 } = {}) {
  const step = 0.095 * pxm;
  let row = 0;
  for (let y = offset; y < h + step; y += step * 0.5, row++) {
    for (let x = row % 2 ? step / 2 : 0; x < w + step; x += step) {
      const px = x + (rng() - 0.5) * 9, py = y + (rng() - 0.5) * 9;
      // a sprig: a short stem with two leaves and a dot; every fourth one is a lone dot
      if (rng() < 0.25) {
        g.fillStyle = INK;
        g.globalAlpha = 0.55;
        g.beginPath();
        g.arc(px, py, 1.4, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        continue;
      }
      const a = -Math.PI / 2 + (rng() - 0.5) * 1.6;
      const L = 5.5;
      const o = { width: 0.9, wobble: 0.3, rng, alpha: 0.6, segments: 2 };
      inkLine(g, px, py, px + Math.cos(a) * L, py + Math.sin(a) * L, o);
      inkLine(g, px + Math.cos(a) * L * 0.45, py + Math.sin(a) * L * 0.45, px + Math.cos(a + 0.95) * L * 0.5, py + Math.sin(a + 0.95) * L * 0.5, o);
      inkLine(g, px + Math.cos(a) * L * 0.65, py + Math.sin(a) * L * 0.65, px + Math.cos(a - 0.95) * L * 0.5, py + Math.sin(a - 0.95) * L * 0.5, o);
      g.fillStyle = INK;
      g.globalAlpha = 0.6;
      g.beginPath();
      g.arc(px + Math.cos(a) * L * 1.15, py + Math.sin(a) * L * 1.15, 1.1, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
  }
}

// ---------- the hanging skirt: uv.y = 1 at the hem; 0.5 m of cloth per texture height ----------
// u runs 0..2 around (the texture repeats twice, so one texture width is half a turn).
export function skirtTexture(W = 0.78, Rtop = 0.608) {
  return drawTexture(
    2048,
    512,
    (g, w, h, rng) => {
      paper(g, w, h, '#f7f3eb', { grain: 0.03, seed: 22 });
      const pxm = h / 0.5; // 1024 px per metre
      const hem = h - 2;
      sprigs(g, w, h, pxm, rng, { offset: 11 });
      // the inner square's line continues down the skirt at the corners: at angle th the fabric
      // meridian meets it (W - 0.5) / max(|cos|,|sin|) above the hem; drawn as a curve.
      const inner = (th) => (W - 0.5) / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)));
      for (const dy of [0, 9]) {
        let px = null, py = null;
        for (let x = 0; x <= w; x += 6) {
          const th = (x / w) * Math.PI;
          const above = inner(th);
          const y = hem - above * pxm + dy;
          if (px != null) inkLine(g, px, py, x, y, { width: dy ? 1 : 1.5, wobble: 0.6, rng, alpha: 0.85, segments: 2 });
          px = x;
          py = y;
        }
      }
      // stitched hem: a row of short dashes just above the edge
      for (let x = 0; x < w; x += 9) inkLine(g, x, hem - 8 + (rng() - 0.5), x + 4.5, hem - 8 + (rng() - 0.5), { width: 1.2, wobble: 0.2, rng, alpha: 0.8, segments: 2 });
      // the border band: double line, motif row, double line, then a scallop above
      const y1 = hem - 0.02 * pxm, y2 = hem - 0.065 * pxm;
      for (const [y, wd] of [
        [y1, 1.8],
        [y1 - 6, 1.0],
        [y2, 1.8],
        [y2 + 6, 1.0],
      ]) {
        for (let x = 0; x < w; x += 256) inkLine(g, x - 3, y, x + 259, y, { width: wd, wobble: 0.9, rng, alpha: 0.9 });
      }
      const step = 0.05 * pxm;
      const ym = (y1 + y2) / 2;
      for (let i = 0, x = step / 2; x < w; x += step, i++) motif(g, x, ym, 8.5, i % 3, rng);
      scallop(g, 0, w, y2 - 8, 0.032 * pxm, 9, rng, -1);
      // a woven stripe further up (visible just under the table edge on the short sides)
      const y3 = hem - 0.1 * pxm;
      for (let x = 0; x < w; x += 256) inkLine(g, x - 3, y3, x + 259, y3, { width: 1.3, wobble: 0.8, rng, alpha: 0.8 });
      for (let x = 0; x < w; x += 256) inkLine(g, x - 3, y3 - 6, x + 259, y3 - 6, { width: 1.0, wobble: 0.8, rng, alpha: 0.7 });
      for (let x = 4; x < w; x += 10) inkLine(g, x, y3 - 3, x + 4, y3 - 3, { width: 1.1, wobble: 0.2, rng, alpha: 0.8, segments: 2 });
    },
    { seed: 32, repeat: [2, 1] },
  );
}

// ---------- turned wood: faint vertical grain lines ----------
export function woodTexture() {
  return drawTexture(
    256,
    1024,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.03, seed: 23 });
      for (let x = 6; x < w; x += 11 + rng() * 9) {
        const n = 3 + Math.floor(rng() * 4);
        let y = rng() * 120;
        for (let k = 0; k < n && y < h; k++) {
          const len = 80 + rng() * 260;
          inkLine(g, x + (rng() - 0.5) * 3, y, x + (rng() - 0.5) * 6, y + len, { width: 0.9, wobble: 1.4, rng, alpha: 0.28 });
          y += len + 30 + rng() * 120;
        }
      }
    },
    { seed: 33, repeat: [1, 1] },
  );
}

// ---------- the wine bottle's label, wrapped: label centred at u = 0.5 ----------
export function bottleLabelTexture() {
  return drawTexture(
    512,
    512,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.0 });
      // label occupies u 0.33..0.67, v 0.16..0.44 (v measured from the bottom)
      const x0 = w * 0.33, x1 = w * 0.67;
      const y0 = h * (1 - 0.44), y1 = h * (1 - 0.16);
      g.fillStyle = '#faf7f1';
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      inkRect(g, x0, y0, x1 - x0, y1 - y0, { width: 2, wobble: 1, rng });
      inkRect(g, x0 + 7, y0 + 7, x1 - x0 - 14, y1 - y0 - 14, { width: 1, wobble: 0.8, rng });
      const cx = (x0 + x1) / 2;
      letter(g, 'VIN', cx, y0 + 34, { size: 30, rng, weight: 700, tracking: 0.18 });
      letter(g, 'ORDINAIRE', cx, y0 + 62, { size: 17, rng, weight: 600, tracking: 0.16 });
      // a small crest: a wobbly shield with hatching and a star
      const sy = y0 + 96;
      inkCircle(g, cx, sy, 16, { width: 1.5, wobble: 0.9, rng });
      inkCircle(g, cx, sy, 12, { width: 1, wobble: 0.6, rng });
      g.save();
      g.beginPath();
      g.arc(cx, sy, 11.5, 0, Math.PI * 2);
      g.clip();
      hatch(g, cx - 12, sy - 12, 24, 12, { angle: Math.PI / 4, spacing: 3.5, width: 0.9, wobble: 0.3, broken: 0, rng });
      g.restore();
      letter(g, '12°', cx, y1 - 22, { size: 13, rng, weight: 500, tracking: 0.1 });
      inkLine(g, cx - 40, y1 - 36, cx + 40, y1 - 36, { width: 1, wobble: 0.5, rng });
      letter(g, 'MIS EN BOUTEILLE', cx, y1 - 11, { size: 8, rng, weight: 500, tracking: 0.12 });
      // a neck label band at v 0.86..0.9
      const ny0 = h * (1 - 0.9), ny1 = h * (1 - 0.86);
      g.fillStyle = '#faf7f1';
      g.fillRect(0, ny0, w, ny1 - ny0);
      inkLine(g, 0, ny0, w, ny0, { width: 1.5, wobble: 0.7, rng });
      inkLine(g, 0, ny1, w, ny1, { width: 1.5, wobble: 0.7, rng });
    },
    { seed: 34 },
  );
}

// ---------- the folded newspaper's top face (top half of the front page) ----------
export function newspaperTexture() {
  return drawTexture(
    768,
    512,
    (g, w, h, rng) => {
      paper(g, w, h, '#f4f0e6', { grain: 0.04, seed: 25 });
      const m = 26;
      // masthead
      inkLine(g, m, 22, w - m, 22, { width: 2.2, wobble: 0.8, rng });
      letter(g, 'LE COURRIER DU SOIR', w / 2, 58, { size: 44, rng, weight: 700, tracking: 0.1 });
      inkLine(g, m, 92, w - m, 92, { width: 2.2, wobble: 0.8, rng });
      inkLine(g, m, 97, w - m, 97, { width: 1, wobble: 0.6, rng });
      letter(g, 'ÉDITION DU SOIR  —  PRIX 40 CENTIMES  —  DIMANCHE', w / 2, 110, { size: 11, rng, weight: 500, tracking: 0.1 });
      inkLine(g, m, 124, w - m, 124, { width: 1, wobble: 0.6, rng });
      // headline across two columns
      letter(g, 'LA PLUIE CONTINUE', m, 158, { size: 30, rng, weight: 700, tracking: 0.06, align: 'left' });
      letter(g, 'Les autorités restent optimistes', m, 186, { size: 14, rng, weight: 500, tracking: 0.02, align: 'left', family: "'Jost', sans-serif" });
      // columns of text: rows of little strokes
      const cols = 4, gap = 14, cw = (w - 2 * m - gap * (cols - 1)) / cols;
      for (let c = 0; c < cols; c++) {
        const x = m + c * (cw + gap);
        const yTop = c < 2 ? 204 : 138;
        if (c === 3) {
          // a photograph: a cross-hatched box with a caption
          inkRect(g, x, yTop, cw, 120, { width: 1.5, wobble: 0.6, rng });
          crossHatch(g, x + 2, yTop + 2, cw - 4, 116, { spacing: 5, width: 0.9, wobble: 0.4, broken: 0.1, rng, alpha: 0.5 });
          hatch(g, x + 2, yTop + 60, cw - 4, 58, { angle: Math.PI / 2, spacing: 4, width: 1, wobble: 0.4, broken: 0, rng, alpha: 0.7 });
          for (let y = yTop + 134; y < h - 20; y += 9) inkLine(g, x, y, x + cw * (0.7 + rng() * 0.3), y, { width: 1.3, wobble: 0.35, rng, alpha: 0.55 });
          continue;
        }
        for (let y = yTop; y < h - 20; y += 9) {
          if (rng() < 0.06) {
            y += 6;
            inkLine(g, x, y, x + cw * 0.6, y, { width: 2.2, wobble: 0.4, rng, alpha: 0.9 });
            y += 4;
            continue;
          }
          inkLine(g, x, y, x + cw * (rng() < 0.15 ? 0.4 + rng() * 0.4 : 0.92 + rng() * 0.08), y, { width: 1.3, wobble: 0.35, rng, alpha: 0.55 });
        }
        if (c > 0) inkLine(g, x - gap / 2, c < 2 ? 204 : 138, x - gap / 2, h - 20, { width: 0.8, wobble: 0.5, rng, alpha: 0.6 });
      }
    },
    { seed: 35 },
  );
}

// ---------- a matchbox label ----------
export function matchboxTexture() {
  return drawTexture(
    256,
    160,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.02 });
      inkRect(g, 8, 8, w - 16, h - 16, { width: 2, wobble: 0.8, rng });
      inkRect(g, 14, 14, w - 28, h - 28, { width: 1, wobble: 0.6, rng });
      letter(g, 'ALLUMETTES', w / 2, 42, { size: 24, rng, weight: 700, tracking: 0.12 });
      // a little drawn match with a flame
      inkLine(g, w / 2 - 30, 92, w / 2 + 22, 92, { width: 3, wobble: 0.5, rng });
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(w / 2 + 26, 92, 6, 5, 0, 0, Math.PI * 2);
      g.fill();
      inkCircle(g, w / 2 + 26, 84, 7, { width: 1.2, wobble: 0.7, rng });
      letter(g, 'DE SÛRETÉ', w / 2, 122, { size: 13, rng, weight: 500, tracking: 0.14 });
      hatch(g, 14, h - 30, w - 28, 16, { angle: 0, spacing: 3, width: 0.8, wobble: 0.3, broken: 0.1, rng, alpha: 0.5 });
    },
    { seed: 36 },
  );
}

// ---------- coin face ----------
export function coinTexture() {
  return drawTexture(
    128,
    128,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.02 });
      inkCircle(g, 64, 64, 56, { width: 2, wobble: 0.9, rng });
      inkCircle(g, 64, 64, 48, { width: 1, wobble: 0.7, rng, gaps: 0.1 });
      letter(g, '1', 64, 58, { size: 44, rng, weight: 700 });
      letter(g, 'FRANC', 64, 92, { size: 13, rng, weight: 600, tracking: 0.12 });
    },
    { seed: 37 },
  );
}

// ---------- café china: a painted band near the rim (repeats around) ----------
export function chinaTexture() {
  return drawTexture(
    512,
    128,
    (g, w, h, rng) => {
      paper(g, w, h, '#faf7f1', { grain: 0.0 });
      // band lives at v 0.78..0.9 (top of the object): two lines and a row of tiny dots
      const y0 = h * (1 - 0.9), y1 = h * (1 - 0.78);
      inkLine(g, -2, y0, w + 2, y0, { width: 2, wobble: 0.5, rng });
      inkLine(g, -2, y1, w + 2, y1, { width: 1.2, wobble: 0.5, rng });
      g.fillStyle = INK;
      for (let x = 6; x < w; x += 12) {
        g.beginPath();
        g.arc(x, (y0 + y1) / 2, 1.8, 0, Math.PI * 2);
        g.fill();
      }
    },
    { seed: 38, repeat: [1, 1] },
  );
}

// ---------- glass: an alpha mask so the ink pass sees only what a pen would draw of a glass ----------
// A lathe's u runs around (u = 0.25 and 0.75 are the silhouettes for a camera on the z axis),
// v runs along the profile by point index. `solid` = [v0, v1] ranges drawn as opaque (foot, stem,
// rim); everywhere else only two hairline bands at the silhouettes survive, so what is inside the
// glass (the wine) shows through as a pen would draw it.
export function glassMaskTexture(solid, { band = 0.012 } = {}) {
  const c = makeGlassCanvas(256, 256, solid, band);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeGlassCanvas(w, h, solid, band) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#f6f2ea';
  for (const [v0, v1] of solid) g.fillRect(0, Math.round((1 - v1) * h), w, Math.max(1, Math.round((v1 - v0) * h)));
  for (const u of [0.25, 0.75]) g.fillRect(Math.round((u - band) * w), 0, Math.max(2, Math.round(band * 2 * w)), h);
  return c;
}

export function wrapRepeat(t) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
