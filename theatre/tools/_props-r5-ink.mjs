// throwaway (props round 5): how much INK is in the bottom band of a plate, by thirds. A raycast
// names the mesh; this says whether anything is printed on it.
//   node tools/_props-r5-ink.mjs <png> [bandFraction=0.06]
import sharp from 'sharp';

const file = process.argv[2];
const frac = Number(process.argv[3] ?? 0.06);
const img = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = img.info;
const y0 = Math.round(H * (1 - frac));
const thirds = [0, Math.round(W / 3), Math.round((2 * W) / 3), W];
const out = [];
for (let t = 0; t < 3; t++) {
  let dark = 0, n = 0, mid = 0;
  for (let y = y0; y < H; y++) {
    for (let x = thirds[t]; x < thirds[t + 1]; x++) {
      const i = (y * W + x) * 4;
      const v = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
      n++;
      if (v < 128) dark++;
      else if (v < 232) mid++;
    }
  }
  out.push(`${['left', 'centre', 'right'][t]} ${((dark / n) * 100).toFixed(2)}% ink, ${((mid / n) * 100).toFixed(2)}% half-tone`);
}
console.log(`${file.split('/').pop()}  bottom ${(frac * 100).toFixed(0)}% (rows ${y0}..${H}):  ` + out.join(' | '));
