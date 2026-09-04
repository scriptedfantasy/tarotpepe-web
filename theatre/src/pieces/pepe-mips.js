// pepe-mips — the cut-out's mip chain, printed instead of averaged.
//
// THE FAULT THIS EXISTS FOR. Pepe is a `colorful` material, and a colorful material is the one
// thing the ink pass shows VERBATIM: `base = alb.rgb` (ink-shaders.js). Every other surface in the
// room has its drawing re-stated by the pen — the composite decides each mark against the midpoint
// of its own nib-wide field and lays it down as ink or leaves it as paper, never between — but his
// drawing arrives on screen exactly as the texture unit hands it over. And the texture unit hands
// over an AVERAGE: generateMipmaps halves the sheet by averaging four texels into one, so a pen
// line and the paper either side of it are mixed, level after level, into a grey. In the judging
// shot the frame minifies him about three times; his contour and every line in his face came
// through as a soft mid-grey with an anti-aliased fringe while the chair 200 px away was hard
// black. That is the whole of the "he does not share the room's pen" note, and none of it was the
// drawing's fault: it was the filter.
//
// THE RULE HERE is the one a printer uses when a plate is reduced, and the one STYLE §1.2 states
// for the whole world: one pen, one pressure — a mark is ink or it is paper, never a grey. Each
// level asks of every 2x2 what fraction of it was INK; if that is half or more the texel is set to
// solid ink, and if it is less the texel takes the average of the FILLS only, with the ink left
// out of it altogether. So a line loses width as it recedes (three texels, two, one) and then
// holds at one texel at full pressure — it may get shorter or break, it never fades. The fills
// stay flat because they never have ink mixed into them.
//
// Alpha is the exception and is averaged plainly: alpha is the silhouette, the ink pass draws that
// itself off the depth buffer, and a dilating or eroding filter would walk his outline in or out
// as the camera moved.
//
// Deep levels relax back toward a plain average (KEEP): at a thumbnail every mark would otherwise
// hold its texel and the whole drawing would crowd to a black chip.
import * as THREE from 'three';
import { makeCanvas } from '../core/strokes.js';

const INK = [13, 14, 13]; // #0d0e0d, the world's ink
// A texel is a MARK below this luminance. The generator writes ink-or-fill already, and the
// darkest fill on the sheet is the drawing's shaded green (lum 137); the ink is 14. 70 sits
// between them with room on both sides, so a shaded jowl is never mistaken for a stroke.
const INK_LUM = 70;
// how much of the printer's rule survives at each level; the rest is a plain average
const KEEP = [1, 1, 1, 1, 0.85, 0.6, 0.35, 0.18];
const keepAt = (l) => KEEP[Math.min(l, KEEP.length - 1)];

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// One level down: dw x dh from a sw x sh RGBA buffer.
function halve(src, sw, sh, dw, dh, keep) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const ya = Math.min(sh - 1, 2 * y) * sw, yb = Math.min(sh - 1, 2 * y + 1) * sw;
    for (let x = 0; x < dw; x++) {
      const xa = Math.min(sw - 1, 2 * x), xb = Math.min(sw - 1, 2 * x + 1);
      const p = [(ya + xa) * 4, (ya + xb) * 4, (yb + xa) * 4, (yb + xb) * 4];
      // alpha: a plain box average — the silhouette must not walk
      let aSum = 0, inkA = 0, fillA = 0, fr = 0, fg = 0, fb = 0, br = 0, bg = 0, bb = 0;
      for (let k = 0; k < 4; k++) {
        const o = p[k], a = src[o + 3];
        aSum += a;
        br += src[o] * a;
        bg += src[o + 1] * a;
        bb += src[o + 2] * a;
        if (lum(src[o], src[o + 1], src[o + 2]) < INK_LUM) inkA += a;
        else {
          fillA += a;
          fr += src[o] * a;
          fg += src[o + 1] * a;
          fb += src[o + 2] * a;
        }
      }
      const o = (y * dw + x) * 4;
      out[o + 3] = Math.round(aSum * 0.25);
      if (aSum <= 0) {
        // clear everywhere: keep the bled colour so bilinear never pulls a dark fringe in
        out[o] = (src[p[0]] + src[p[1]] + src[p[2]] + src[p[3]]) * 0.25;
        out[o + 1] = (src[p[0] + 1] + src[p[1] + 1] + src[p[2] + 1] + src[p[3] + 1]) * 0.25;
        out[o + 2] = (src[p[0] + 2] + src[p[1] + 2] + src[p[2] + 2] + src[p[3] + 2]) * 0.25;
        continue;
      }
      const boxR = br / aSum, boxG = bg / aSum, boxB = bb / aSum;
      let pr, pg, pb;
      if (inkA * 2 >= aSum || fillA <= 0) {
        pr = INK[0];
        pg = INK[1];
        pb = INK[2];
      } else {
        pr = fr / fillA;
        pg = fg / fillA;
        pb = fb / fillA;
      }
      out[o] = boxR + (pr - boxR) * keep;
      out[o + 1] = boxG + (pg - boxG) * keep;
      out[o + 2] = boxB + (pb - boxB) * keep;
    }
  }
  return out;
}

// The whole chain (level 0 included) as canvases, ready for THREE.Texture.mipmaps.
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
