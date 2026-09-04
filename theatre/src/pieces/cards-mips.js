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
