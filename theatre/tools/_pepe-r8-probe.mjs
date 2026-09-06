// r8: measure the body cut-out's alpha, row by row, to find where a standing figure can be cut.
import sharp from 'sharp';
import fs from 'node:fs';
const P = new URL('../public/pepe/', import.meta.url).pathname;
const man = JSON.parse(fs.readFileSync(P + 'cutout.json', 'utf8'));
const L = man.layers.body;
const [bx, by, bw, bh] = L.box;
const { data, info } = await sharp(P + L.file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
console.log('body png', info.width, info.height, 'box', L.box, 'hiSize', man.hiSize);
const W = info.width, H = info.height;
const runsOf = (y) => {
  const runs = [];
  let s = -1;
  for (let x = 0; x < W; x++) {
    const a = data[(y * W + x) * 4 + 3];
    if (a > 128 && s < 0) s = x;
    else if (a <= 128 && s >= 0) { runs.push([s + bx, x - 1 + bx]); s = -1; }
  }
  if (s >= 0) runs.push([s + bx, W - 1 + bx]);
  return runs.filter((r) => r[1] - r[0] > 3);
};
for (let y = 0; y < H; y += 16) {
  const gy = y + by;
  console.log(String(gy).padStart(4), 'src', (gy / man.K).toFixed(0).padStart(3), runsOf(y).map((r) => `${r[0]}-${r[1]}`).join('  '));
}
