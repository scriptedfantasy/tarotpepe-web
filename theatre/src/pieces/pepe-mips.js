// pepe-mips — the cut-out's mip chain: full-ink PIGMENT, and an EDGE that stays coverage.
//
// THE FAULT THIS EXISTS FOR (round 5/6). Pepe is a `colorful` material, and a colorful material is
// the one thing the ink pass shows VERBATIM: `base = alb.rgb` (ink-shaders.js). Every other surface
// in the room has its drawing re-stated by the pen; his arrives on screen exactly as the texture
// unit hands it over. And the texture unit hands over an AVERAGE: generateMipmaps halves the sheet
// by averaging four texels into one, so once the frame minifies him past the point where a pen line
// is a whole texel, the line and the paper either side of it are averaged into a MID GREY. That is
// the "he does not share the room's pen" note, and it was the filter's fault, not the drawing's.
//
// THE FAULT ROUND 6 MADE FIXING IT, which is what this file is now. Round 6 rebuilt the chain under
// "a printer's rule — every level is ink or fill, never between": each 2x2 asked what fraction of
// it was ink and, at a half or more, was SET TO SOLID INK. That is the ink piece's round-4 mistake
// under another name. **"No grey" is a rule about TONE, not about rasterisation** (BRIEF.md): a mark
// is ink or paper in its PIGMENT, but its EDGE is COVERAGE, and coverage is anti-aliased. A hard
// step at every level gives an edge that is blocky at rest — it can only land on that level's texel
// lattice, which at the home shot is a pixel and a half — and that crawls frame to frame as the
// lattice slides under him. Measured on the delivered frame: his silhouette was a 5 px band of
// mottled dark against the room's 3 px stroke, with pepper thrown off it into the paper.
//
// THE RULE HERE, and it is the one the ink pass keeps for the room's own pen. A texel is
//
//     mix(FILL, INK, coverage)
//
// and the three parts are filtered as what they are:
//   · COVERAGE is box-averaged — smoothly, no threshold anywhere — so the boundary of a mark moves
//     a fraction of a texel at a time and never walks between levels;
//   · then the pigment is restored by a GAIN on that coverage, not a step: `cov = min(1, C*gain)`.
//     A line that the level has shrunk to four fifths of a texel has its core put back to full ink
//     and keeps its shoulder in proportion — it loses WIDTH as it recedes, never VALUE, which is
//     the printer's rule stated as a ramp instead of a cliff. Paper (C = 0) is untouched at every
//     gain, so a flat fill can never be darkened into a wash.
//   · FILL is averaged with the ink taken out of it (each texel's fill is un-mixed from under its
//     own ink first), so the greens stay the flat plate they were drawn as and never pick up a
//     grey cast from the line crossing them.
//   · ALPHA is averaged plainly. It is the silhouette, and a dilating or eroding filter would walk
//     his outline in or out as the camera moved.
//
// And every level is summed from LEVEL 0, not from the level above: the accumulators below are
// sums, halving them is exact, and the gain is applied once, at the end, to an untouched average.
// Round 6 compounded its rule level on level, which is a large part of how a gentle decision
// turned into a cliff by the third halving.
//
// Deep levels relax the gain back to 1 (KEEP): at a thumbnail every mark would otherwise hold its
// texel at full ink and the whole drawing would crowd to a black chip.
import * as THREE from 'three';
import { makeCanvas } from '../core/strokes.js';

const INK = [13, 14, 13]; // #0d0e0d, the world's ink

// How much of a texel is ink. The generator composites `mix(fill, INK, INKA)` over a flat palette,
// so a texel's luminance reads straight back as coverage against a fixed pair of stops: the ink is
// lum 14 and the darkest fill on the sheet is the drawing's shaded green at 137, so 20 and 110 sit
// clear of both and the ramp between them is the drawn stroke's own anti-aliased edge — read as the
// coverage it is, not thresholded into a decision.
const COV_LO = 110, COV_HI = 20;

// The pigment gain per level. 1.0 is a plain average. The line is 6.7 texels wide on the sheet, so
// it is still more than a texel at level 2 and needs almost nothing; by level 3 it is four fifths
// of one and wants its core put back. Past level 5 he is a chip in the frame and the gain comes off
// so the drawing does not crowd to black.
const GAIN = [1, 1.06, 1.25, 1.55, 1.7, 1.4, 1.15, 1.0];
const gainAt = (l) => GAIN[Math.min(l, GAIN.length - 1)];

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// The eight sums a level carries, all in level-0 units so halving is an exact box sum:
//   a      alpha
//   ink    alpha × coverage                (the ink mass)
//   fw     alpha × (1 - coverage)          (the fill's weight)
//   fr/fg/fb  fw × the fill colour un-mixed from under the ink
//   zr/zg/zb  the plain colour of every texel, alpha or not (the bled colour, for clear blocks)
function level0(src, w, h) {
  const n = w * h;
  const A = new Float32Array(n), I = new Float32Array(n), FW = new Float32Array(n);
  const FR = new Float32Array(n), FG = new Float32Array(n), FB = new Float32Array(n);
  const ZR = new Float32Array(n), ZG = new Float32Array(n), ZB = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = src[o], g = src[o + 1], b = src[o + 2], a = src[o + 3] / 255;
    ZR[i] = r;
    ZG[i] = g;
    ZB[i] = b;
    const c = clamp01((COV_LO - lum(r, g, b)) / (COV_LO - COV_HI));
    A[i] = a;
    I[i] = a * c;
    const fw = a * (1 - c);
    FW[i] = fw;
    if (fw > 0) {
      // un-mix: what the plate under this texel's ink was, before the pen went over it
      const k = 1 - c;
      FR[i] = fw * Math.min(255, Math.max(0, (r - INK[0] * c) / k));
      FG[i] = fw * Math.min(255, Math.max(0, (g - INK[1] * c) / k));
      FB[i] = fw * Math.min(255, Math.max(0, (b - INK[2] * c) / k));
    }
  }
  return { A, I, FW, FR, FG, FB, ZR, ZG, ZB, w, h, n: 1 };
}

// one level down: a plain 2x2 SUM of every accumulator (exact, so nothing compounds)
function halveSums(L) {
  const sw = L.w, sh = L.h;
  const dw = Math.max(1, sw >> 1), dh = Math.max(1, sh >> 1);
  const keys = ['A', 'I', 'FW', 'FR', 'FG', 'FB', 'ZR', 'ZG', 'ZB'];
  const out = { w: dw, h: dh, n: L.n * 4 };
  for (const k of keys) out[k] = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const ya = Math.min(sh - 1, 2 * y) * sw, yb = Math.min(sh - 1, 2 * y + 1) * sw;
    for (let x = 0; x < dw; x++) {
      const xa = Math.min(sw - 1, 2 * x), xb = Math.min(sw - 1, 2 * x + 1);
      const p0 = ya + xa, p1 = ya + xb, p2 = yb + xa, p3 = yb + xb;
      const d = y * dw + x;
      for (const k of keys) {
        const s = L[k];
        out[k][d] = s[p0] + s[p1] + s[p2] + s[p3];
      }
    }
  }
  return out;
}

// a level's RGBA, printed from its sums
function paint(L, gain) {
  const { A, I, FW, FR, FG, FB, ZR, ZG, ZB, w, h, n } = L;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const a = A[i];
    out[o + 3] = Math.round((a / n) * 255);
    if (a <= 1e-4) {
      // clear everywhere: keep the bled colour so bilinear never pulls a dark fringe in
      out[o] = ZR[i] / n;
      out[o + 1] = ZG[i] / n;
      out[o + 2] = ZB[i] / n;
      continue;
    }
    const C = I[i] / a; // this texel's ink coverage, averaged smoothly — no threshold anywhere
    const cov = Math.min(1, C * gain); // …and the pigment put back as a ramp, not a cliff
    const fw = FW[i];
    const fr = fw > 1e-4 ? FR[i] / fw : INK[0];
    const fg = fw > 1e-4 ? FG[i] / fw : INK[1];
    const fb = fw > 1e-4 ? FB[i] / fw : INK[2];
    out[o] = fr + (INK[0] - fr) * cov;
    out[o + 1] = fg + (INK[1] - fg) * cov;
    out[o + 2] = fb + (INK[2] - fb) * cov;
  }
  return out;
}

// The whole chain (level 0 included) as canvases, ready for THREE.Texture.mipmaps.
export function inkMipmaps(image, w, h) {
  const c0 = makeCanvas(w, h);
  const g0 = c0.getContext('2d', { willReadFrequently: true });
  g0.drawImage(image, 0, 0, w, h);
  const levels = [c0];
  let L = level0(g0.getImageData(0, 0, w, h).data, w, h);
  let l = 0;
  while (L.w > 1 || L.h > 1) {
    L = halveSums(L);
    l++;
    const data = paint(L, gainAt(l));
    const c = makeCanvas(L.w, L.h);
    c.getContext('2d').putImageData(new ImageData(data, L.w, L.h), 0, 0);
    levels.push(c);
  }
  return levels;
}

// Hang the chain on a loaded cut-out texture, plus every scrap of anisotropy the machine has.
export function inkFilter(tex, renderer) {
  const img = tex.image;
  const w = img?.naturalWidth || img?.width || 0;
  const h = img?.naturalHeight || img?.height || 0;
  if (!w || !h) return tex;
  try {
    tex.mipmaps = inkMipmaps(img, w, h);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
  } catch (e) {
    console.warn('[pepe] ink mips failed; falling back to generated ones', e);
  }
  const max = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
  tex.anisotropy = Math.max(tex.anisotropy || 1, max);
  tex.needsUpdate = true;
  return tex;
}
