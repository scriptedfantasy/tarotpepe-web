// throwaway: crop a region of a reference and report ink coverage
import sharp from 'sharp';
const [file, l, t, w, h, out] = process.argv.slice(2);
const img = sharp(file).extract({ left: +l, top: +t, width: +w, height: +h });
if (out) await img.clone().toFile(out);
const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
let dark = 0;
const cols = 6, rows = 4;
const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
const cnt = Array.from({ length: rows }, () => new Array(cols).fill(0));
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    const c = Math.min(cols - 1, Math.floor((x / W) * cols));
    const r = Math.min(rows - 1, Math.floor((y / H) * rows));
    cnt[r][c]++;
    if (lum < 0.6) {
      grid[r][c]++;
      dark++;
    }
  }
console.log(`${file} [${l},${t},${w}x${h}] dark ${((dark / (W * H)) * 100).toFixed(1)}%`);
for (let r = 0; r < rows; r++) console.log(grid[r].map((v, c) => ((v / cnt[r][c]) * 100).toFixed(0).padStart(5)).join(''));
