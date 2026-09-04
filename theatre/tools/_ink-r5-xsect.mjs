#!/usr/bin/env node
// Cross-sections of contours: find isolated dark runs along a scanline and print the grey profile,
// so "how wide and how dark is the pen" can be read off a real frame instead of off the shader.
//   node tools/_ink-r5-xsect.mjs <img> <y0> <y1> [step]
import sharp from 'sharp';
const [file, y0, y1, step = '9'] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const PAPER = 224, DARK = 64;
const profiles = [];
for (let y = +y0; y <= +y1; y += +step) {
  for (let x = 6; x < w - 6; x++) {
    const i = y * w + x;
    // a local minimum that is genuinely dark, with paper 5 px either side: one isolated stroke
    if (data[i] >= DARK) continue;
    if (data[i] > data[i - 1] || data[i] > data[i + 1]) continue;
    if (data[i - 5] < PAPER || data[i + 5] < PAPER) continue;
    profiles.push(Array.from({ length: 9 }, (_, k) => data[i - 4 + k]));
  }
}
if (!profiles.length) { console.log('no isolated strokes found'); process.exit(0); }
const mean = Array.from({ length: 9 }, (_, k) => profiles.reduce((a, p) => a + p[k], 0) / profiles.length);
const cov = mean.map((v) => (248 - v) / (248 - 13));
console.log(`${profiles.length} isolated strokes`);
console.log('offset px   ' + [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => String(k).padStart(6)).join(''));
console.log('mean grey   ' + mean.map((v) => v.toFixed(0).padStart(6)).join(''));
console.log('coverage    ' + cov.map((v) => v.toFixed(2).padStart(6)).join(''));
const at = (t) => {
  // width in px where coverage >= t, by linear interpolation on the mean profile
  let lo = 0, hi = 8;
  for (let k = 0; k < 4; k++) if (cov[k] < t && cov[k + 1] >= t) lo = k + (t - cov[k]) / (cov[k + 1] - cov[k]);
  for (let k = 8; k > 4; k--) if (cov[k] < t && cov[k - 1] >= t) hi = k - (t - cov[k]) / (cov[k - 1] - cov[k]);
  return hi - lo;
};
console.log(`width  @cov .79 (grey<=64) ${at(0.79).toFixed(2)} px   @cov .50 ${at(0.5).toFixed(2)} px   @cov .13 (grey<=224) ${at(0.13).toFixed(2)} px`);
console.log(`darkest mean grey ${Math.min(...mean).toFixed(0)}  (paper 248, ink 13)`);
