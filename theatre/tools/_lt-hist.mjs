#!/usr/bin/env node
// node tools/_lt-hist.mjs <lit.png> [tone.y] → how much of the frame sits in each tone band, and
// what tone level each band becomes on a wall (hatch .30), the door (.44) and a reveal (.66).
import sharp from 'sharp';
const inp = process.argv[2];
const tY = +(process.argv[3] ?? 0.5);
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const LV = [0.55, 0.82, 0.96];
const soaks = { 'plaster .12': 0.12 / 0.45, 'wainscot .24': 0.24 / 0.45, 'paper .30': 0.30 / 0.45, 'sidewall .34': 0.34 / 0.45, 'door .44': 0.44 / 0.45, 'reveal .66': 1, 'props .5': 1 };
const bands = [0.02, 0.05, 0.09, 0.14, 0.22, 0.35, 0.55, 1.01];
const cnt = new Array(bands.length).fill(0);
let n = 0;
for (let i = 0; i < W * H; i++) {
  const j = i * C;
  const L = (data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722) / 255;
  n++;
  for (let b = 0; b < bands.length; b++) if (L < bands[b]) { cnt[b]++; break; }
}
console.log(inp, `${W}x${H}`);
let lo = 0;
for (let b = 0; b < bands.length; b++) {
  const mid = (lo + bands[b]) / 2;
  const shade = 1 - ss(0, tY, mid);
  const lvls = Object.entries(soaks).map(([k, s]) => {
    const d = shade * s;
    return `${k.split(' ')[0]}:${(d >= LV[2] ? 3 : d >= LV[1] ? 2 : d >= LV[0] ? 1 : 0)}`;
  }).join(' ');
  console.log(`L ${lo.toFixed(2)}-${bands[b].toFixed(2)}  ${((cnt[b] / n) * 100).toFixed(1).padStart(5)}%  shade ${shade.toFixed(2)}  ${lvls}`);
  lo = bands[b];
}
