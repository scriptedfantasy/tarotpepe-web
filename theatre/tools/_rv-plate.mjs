#!/usr/bin/env node
// scratch: how sharp is the card plate at the insert's size?
// Compares (a) the plate as the frame shows it, (b) a plain box reduction of the source (what the
// GPU's generated mip chain does), (c) a "keep the darkest two of four" reduction (cards-mips.js's
// inkFilter, which the BACK gets and the FRONT does not).
// node tools/_rv-plate.mjs <frame.png> <x0> <y0> <w> <h> <source.webp>
import sharp from 'sharp';

const [, , frame, x0, y0, w, h, src] = process.argv;
const W = +w, H = +h;

const grey = async (img) => {
  const { data, info } = await img.greyscale().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
};

// mean |laplacian|: local contrast. A pen drawing scores high, a photographic mush low.
function sharpness(g) {
  let s = 0, n = 0, ink = 0, mid = 0;
  for (let y = 1; y < g.h - 1; y++)
    for (let x = 1; x < g.w - 1; x++) {
      const i = y * g.w + x;
      const l = 4 * g.d[i] - g.d[i - 1] - g.d[i + 1] - g.d[i - g.w] - g.d[i + g.w];
      s += Math.abs(l);
      n++;
      if (g.d[i] < 70) ink++;
      else if (g.d[i] < 200) mid++;
    }
  return { lap: (s / n).toFixed(1), ink: ((100 * ink) / n).toFixed(1), mid: ((100 * mid) / n).toFixed(1) };
}

// the two darkest of each 2x2, averaged: what inkFilter does at every level
function darkHalve(d, sw, sh) {
  const dw = sw >> 1, dh = sh >> 1;
  const out = new Uint8ClampedArray(dw * dh);
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++) {
      const a = d[2 * y * sw + 2 * x], b = d[2 * y * sw + 2 * x + 1];
      const c = d[(2 * y + 1) * sw + 2 * x], e = d[(2 * y + 1) * sw + 2 * x + 1];
      const v = [a, b, c, e].sort((p, q) => p - q);
      out[y * dw + x] = (v[0] + v[1]) / 2;
    }
  return { d: out, w: dw, h: dh };
}
function boxHalve(d, sw, sh) {
  const dw = sw >> 1, dh = sh >> 1;
  const out = new Uint8ClampedArray(dw * dh);
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++)
      out[y * dw + x] = (d[2 * y * sw + 2 * x] + d[2 * y * sw + 2 * x + 1] + d[(2 * y + 1) * sw + 2 * x] + d[(2 * y + 1) * sw + 2 * x + 1]) / 4;
  return { d: out, w: dw, h: dh };
}

const onScreen = await grey(sharp(frame).extract({ left: +x0, top: +y0, width: W, height: H }));
console.log(`on screen   ${onScreen.w}x${onScreen.h}`, sharpness(onScreen));

// the source plate, reduced by halving to about the same size
let g = await grey(sharp(src));
console.log(`source      ${g.w}x${g.h}`, sharpness(g));
let box = g, dark = g;
while (box.w >> 1 >= W) {
  box = boxHalve(box.d, box.w, box.h);
  dark = darkHalve(dark.d, dark.w, dark.h);
}
console.log(`box mips    ${box.w}x${box.h}`, sharpness(box));
console.log(`ink mips    ${dark.w}x${dark.h}`, sharpness(dark));
