// cards-mips — mip levels that keep a pen line black.
//
// The problem this exists for: a card back is a SPARSE drawing. The lattice covers about a tenth of
// the paper, so any averaging filter — which is what generateMipmaps does — turns a 6 px stroke on
// a field of white into a 5 % grey the moment the card is minified, and the ink pass then reads
// that as "almost paper" (its threshold wants ~40 % coverage) and drops the line altogether. That
// is what made the lattice thin out and go grey at the deck's grazing angle: not the lighting, the
// filter. A drawn line must never fade to grey; it may only get shorter or break.
//
// So we build the chain ourselves, with the rule a printer uses when a plate is reduced: the line
// keeps its weight and the paper keeps its white. Each level takes the two DARKEST of its four
// source texels and averages those, which holds a one-texel stroke at one texel wide however far
// down the chain it goes, while four white texels stay white. Deep levels (where the card is a
// thumbnail and the whole drawing would otherwise crowd to black) relax back toward a plain box
// average, so a card seen across the room greys out honestly instead of turning into a black chip.
//
// ── AND THE SAME PROBLEM ONCE THE PLATE CARRIES COLOUR ────────────────────────────────────────
// The user's own back (public/tarotpepe_backside.png, re-inked by tools/back-plate.mjs) has Pepe
// sitting in the middle of it, and he keeps his green. Colour only survives the ink pass on a
// `colorful` material, and a colorful material is the one thing the pass shows VERBATIM
// (`base = alb.rgb`, ink-shaders.js): what the texture unit hands over is what is on screen. So the
// rule above — take the darkest two — cannot be used on it. It reaches into the colour: two texels
// of ink and two of green average to a dark olive, and the darkest-two of a green field beside a
// black line is a green that has been dragged half-way to black. A card back that greened and
// darkened as it receded.
//
// The rule for a coloured plate is pepe-mips.js's, and it is the printer's rule again, stated for
// three quantities instead of one. Every texel of this plate was PRINTED as `mix(fill, INK, c)`
// from three fills — the world's paper, Pepe's skin, Pepe's lips — so it can be read back exactly:
// solve each texel against the three and keep whichever explains it, and you have its FILL and its
// COVERAGE separately, with no threshold anywhere. Then
//   · COVERAGE is box-averaged and the pigment put back with a GAIN, not a step: a line the level
//     has shrunk below a texel keeps its value and loses its width, which is what a plate does when
//     it is reduced;
//   · FILL is averaged with the ink taken out from under it, so the green stays the flat green it
//     was drawn as and never picks up a cast from the line crossing it.
// Deep levels relax the gain to 1: at twenty pixels a fifth of this plate is ink and any gain at
// all crowds the whole thing to a black chip.
import * as THREE from 'three';
import { makeCanvas } from '../core/strokes.js';

// how much of the "darkest two" rule survives at each level; the rest is a plain box average
const KEEP = [1, 1, 1, 1, 0.72, 0.45, 0.28, 0.16];
const keepAt = (l) => KEEP[Math.min(l, KEEP.length - 1)];

// One level down: dw x dh from a sw x sh RGBA buffer.
function halve(src, sw, sh, dw, dh, keep) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const ya = Math.min(sh - 1, 2 * y) * sw, yb = Math.min(sh - 1, 2 * y + 1) * sw;
    for (let x = 0; x < dw; x++) {
      const xa = Math.min(sw - 1, 2 * x), xb = Math.min(sw - 1, 2 * x + 1);
      const p0 = (ya + xa) * 4, p1 = (ya + xb) * 4, p2 = (yb + xa) * 4, p3 = (yb + xb) * 4;
      // luminance of the four, cheap and good enough for ink on paper
      const l0 = src[p0] * 2 + src[p0 + 1] * 5 + src[p0 + 2];
      const l1 = src[p1] * 2 + src[p1 + 1] * 5 + src[p1 + 2];
      const l2 = src[p2] * 2 + src[p2 + 1] * 5 + src[p2 + 2];
      const l3 = src[p3] * 2 + src[p3 + 1] * 5 + src[p3 + 2];
      // the two darkest, without sorting
      let aI = p0, aL = l0, bI = p1, bL = l1;
      if (bL < aL) { const t = aI; aI = bI; bI = t; const u = aL; aL = bL; bL = u; }
      if (l2 < aL) { bI = aI; bL = aL; aI = p2; aL = l2; } else if (l2 < bL) { bI = p2; bL = l2; }
      if (l3 < aL) { bI = aI; bL = aL; aI = p3; aL = l3; } else if (l3 < bL) { bI = p3; bL = l3; }
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = (src[p0 + c] + src[p1 + c] + src[p2 + c] + src[p3 + c]) * 0.25;
        const dark = (src[aI + c] + src[bI + c]) * 0.5;
        out[o + c] = avg + (dark - avg) * keep;
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

// Build the whole chain (level 0 included) as canvases, ready for THREE.Texture.mipmaps.
export function inkMipmaps(image, w, h) {
  const c0 = makeCanvas(w, h);
  const g0 = c0.getContext('2d', { willReadFrequently: true });
  g0.drawImage(image, 0, 0, w, h);
  const levels = [c0];
  let src = g0.getImageData(0, 0, w, h).data;
  let sw = w, sh = h, l = 0;
  while (sw > 1 || sh > 1) {
    const dw = Math.max(1, sw >> 1), dh = Math.max(1, sh >> 1);
    const data = halve(src, sw, sh, dw, dh, keepAt(++l));
    const c = makeCanvas(dw, dh);
    c.getContext('2d').putImageData(new ImageData(data, dw, dh), 0, 0);
    levels.push(c);
    src = data;
    sw = dw;
    sh = dh;
  }
  return levels;
}

// Give a texture that chain, plus every scrap of anisotropy the machine has: at a grazing angle
// the two together are the difference between a drawn lattice and a grey smear.
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
    console.warn('[cards] ink mips failed; falling back to generated ones', e);
  }
  const max = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
  tex.anisotropy = Math.max(tex.anisotropy || 1, max);
  tex.needsUpdate = true;
  return tex;
}

// ── the coloured plate's chain ────────────────────────────────────────────────────────────────
const CINK = [13, 14, 13]; // #0d0e0d
// the three fills tools/back-plate.mjs prints with: paper #f8f9f4, skin #69b964, lips #d37a6c
const FILLS = [[248, 249, 244], [105, 185, 100], [211, 122, 108]];
// the pigment gain per level. The pen line on this plate is 3–5 texels wide, so the first halvings
// need almost nothing; by the third it is under a texel and wants its core back. It comes off again
// deep down — a fifth of this plate is ink, and a gain applied to that is a black chip.
const CGAIN = [1, 1.03, 1.12, 1.3, 1.36, 1.2, 1.06, 1];
const cgainAt = (l) => CGAIN[Math.min(l, CGAIN.length - 1)];

// Read a texel back into the fill it was printed on and how much ink is over it. Exact, because
// this plate really is a lerp between one of three colours and the ink: whichever fill explains the
// texel with the least error is the fill that was under it.
function unmix(r, g, b) {
  let bF = 0, bC = 0, bE = 1e9;
  for (let k = 0; k < 3; k++) {
    const F = FILLS[k];
    const dr = F[0] - CINK[0], dg = F[1] - CINK[1], db = F[2] - CINK[2];
    const den = dr * dr + dg * dg + db * db;
    let c = ((F[0] - r) * dr + (F[1] - g) * dg + (F[2] - b) * db) / den;
    c = c < 0 ? 0 : c > 1 ? 1 : c;
    const er = F[0] + (CINK[0] - F[0]) * c - r, eg = F[1] + (CINK[1] - F[1]) * c - g, eb = F[2] + (CINK[2] - F[2]) * c - b;
    const e = er * er + eg * eg + eb * eb;
    if (e < bE) { bE = e; bF = k; bC = c; }
  }
  return [bF, bC];
}

export function colorMipmaps(image, w, h) {
  const c0 = makeCanvas(w, h);
  const g0 = c0.getContext('2d', { willReadFrequently: true });
  g0.drawImage(image, 0, 0, w, h);
  const levels = [c0];
  const px = g0.getImageData(0, 0, w, h).data;
  let n = w * h;
  // the four sums a level carries, in level-0 units so halving is an exact box sum
  let I = new Float32Array(n), FW = new Float32Array(n);
  let FR = new Float32Array(n), FG = new Float32Array(n), FB = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const [k, c] = unmix(px[o], px[o + 1], px[o + 2]);
    const F = FILLS[k], fw = 1 - c;
    I[i] = c;
    FW[i] = fw;
    FR[i] = fw * F[0];
    FG[i] = fw * F[1];
    FB[i] = fw * F[2];
  }
  let sw = w, sh = h, count = 1, l = 0;
  while (sw > 1 || sh > 1) {
    const dw = Math.max(1, sw >> 1), dh = Math.max(1, sh >> 1);
    const nI = new Float32Array(dw * dh), nFW = new Float32Array(dw * dh);
    const nFR = new Float32Array(dw * dh), nFG = new Float32Array(dw * dh), nFB = new Float32Array(dw * dh);
    for (let y = 0; y < dh; y++) {
      const ya = Math.min(sh - 1, 2 * y) * sw, yb = Math.min(sh - 1, 2 * y + 1) * sw;
      for (let x = 0; x < dw; x++) {
        const xa = Math.min(sw - 1, 2 * x), xb = Math.min(sw - 1, 2 * x + 1);
        const p0 = ya + xa, p1 = ya + xb, p2 = yb + xa, p3 = yb + xb, d = y * dw + x;
        nI[d] = I[p0] + I[p1] + I[p2] + I[p3];
        nFW[d] = FW[p0] + FW[p1] + FW[p2] + FW[p3];
        nFR[d] = FR[p0] + FR[p1] + FR[p2] + FR[p3];
        nFG[d] = FG[p0] + FG[p1] + FG[p2] + FG[p3];
        nFB[d] = FB[p0] + FB[p1] + FB[p2] + FB[p3];
      }
    }
    I = nI; FW = nFW; FR = nFR; FG = nFG; FB = nFB;
    sw = dw; sh = dh; count *= 4; l++;
    const gain = cgainAt(l);
    const out = new Uint8ClampedArray(dw * dh * 4);
    for (let i = 0; i < dw * dh; i++) {
      const o = i * 4;
      const cov = Math.min(1, (I[i] / count) * gain);
      const fw = FW[i];
      const fr = fw > 1e-4 ? FR[i] / fw : CINK[0];
      const fg = fw > 1e-4 ? FG[i] / fw : CINK[1];
      const fb = fw > 1e-4 ? FB[i] / fw : CINK[2];
      out[o] = fr + (CINK[0] - fr) * cov;
      out[o + 1] = fg + (CINK[1] - fg) * cov;
      out[o + 2] = fb + (CINK[2] - fb) * cov;
      out[o + 3] = 255;
    }
    const c = makeCanvas(dw, dh);
    c.getContext('2d').putImageData(new ImageData(out, dw, dh), 0, 0);
    levels.push(c);
  }
  return levels;
}

export function colorFilter(tex, renderer) {
  const img = tex.image;
  const w = img?.naturalWidth || img?.width || 0;
  const h = img?.naturalHeight || img?.height || 0;
  if (!w || !h) return tex;
  try {
    tex.mipmaps = colorMipmaps(img, w, h);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
  } catch (e) {
    console.warn('[cards] colour mips failed; falling back to generated ones', e);
  }
  const max = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
  tex.anisotropy = Math.max(tex.anisotropy || 1, max);
  tex.needsUpdate = true;
  return tex;
}
