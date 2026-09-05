// Are two frames the same picture?  node tools/_same.mjs <a.png> <b.png>
// Prints the share of pixels that differ at all and the mean absolute difference, so "I applied the
// setting as the default" can be checked rather than asserted.
import sharp from 'sharp';
const [, , A, B] = process.argv;
const a = await sharp(A).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const b = await sharp(B).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
  console.log(`different size: ${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}`);
  process.exit(1);
}
let differing = 0;
let sum = 0;
const n = a.data.length / 4;
for (let i = 0; i < a.data.length; i += 4) {
  const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  if (d) differing += 1;
  sum += d / 3;
}
console.log(`${((differing / n) * 100).toFixed(2)}% of pixels differ, mean |diff| ${(sum / n).toFixed(2)} of 255`);
