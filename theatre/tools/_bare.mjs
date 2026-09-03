// throwaway: map the ink density of a frame, for placing a caption on bare paper.
//   node tools/_bare.mjs <png> [blockWfrac blockHfrac prefX prefY]
// prints a 32x18 density map (0 = bare paper, 9 = solid) and the barest block positions.
import sharp from 'sharp';

const [file, wf = '0.3', hf = '0.16', px = '0.5', py = '0.5'] = process.argv.slice(2);
const W = 256;
const { data, info } = await sharp(file).greyscale().resize(W, null, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
const ink = new Float64Array(w * h);
for (let i = 0; i < w * h; i++) ink[i] = Math.max(0, (238 - data[i]) / 238);
const S = new Float64Array((w + 1) * (h + 1));
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) S[(y + 1) * (w + 1) + x + 1] = ink[y * w + x] + S[y * (w + 1) + x + 1] + S[(y + 1) * (w + 1) + x] - S[y * (w + 1) + x];
const sum = (x0, y0, x1, y1) => S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0];

// map
const MC = 32, MR = 18;
let map = '';
for (let r = 0; r < MR; r++) {
  let line = '';
  for (let c = 0; c < MC; c++) {
    const x0 = Math.floor((c * w) / MC), x1 = Math.floor(((c + 1) * w) / MC);
    const y0 = Math.floor((r * h) / MR), y1 = Math.floor(((r + 1) * h) / MR);
    const v = sum(x0, y0, x1, y1) / ((x1 - x0) * (y1 - y0));
    line += ' .:-=+*#%@'[Math.min(9, Math.floor(v * 22))];
  }
  map += `${(r / MR).toFixed(2)} ${line}\n`;
}
console.log(file.split('/').pop());
console.log('     ' + Array.from({ length: MC }, (_, c) => (c % 4 === 0 ? String(Math.round((c / MC) * 100)).padEnd(4, ' ') : '')).join(''));
console.log(map);

const bw = Math.max(2, Math.round(+wf * w)), bh = Math.max(2, Math.round(+hf * h));
const out = [];
for (let y = 0; y + bh <= h; y += 1) for (let x = 0; x + bw <= w; x += 1) {
  const cover = sum(x, y, x + bw, y + bh) / (bw * bh);
  const cx = (x + bw / 2) / w, cy = (y + bh / 2) / h;
  out.push({ cover, cx, cy, score: cover + Math.hypot(cx - +px, cy - +py) * 0.05 });
}
out.sort((a, b) => a.score - b.score);
const picked = [];
for (const c of out) {
  if (picked.some((p) => Math.hypot(p.cx - c.cx, p.cy - c.cy) < 0.12)) continue;
  picked.push(c);
  if (picked.length >= 6) break;
}
console.log(`block ${wf}x${hf} near (${px},${py}):`);
for (const p of picked) console.log(`  x=${p.cx.toFixed(3)} y=${p.cy.toFixed(3)}  ink=${(p.cover * 100).toFixed(1)}%`);
