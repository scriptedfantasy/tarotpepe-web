#!/usr/bin/env node
// node tools/_lt-sample.mjs <lit.png>  → luminance at named points of the home frame, and what
// tone level the ink pass's default thresholds would make of each.
import sharp from 'sharp';
const inp = process.argv[2];
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const PTS = {
  'wall bare (mid)': [860, 250],
  'wall over clock': [845, 100],
  'wall L of shutters': [300, 180],
  'under shelf L board': [520, 520],
  'shadow R of vase': [985, 440],
  'shadow on door': [1265, 560],
  'door bare': [1200, 300],
  'shutter face': [560, 120],
  'table top': [800, 700],
  'table skirt R': [1080, 810],
  'table skirt L': [560, 810],
  'floor front L': [300, 860],
  'bottle R side': [1500, 470],
  'pepe chest': [800, 560],
  'ceiling/wall corner R': [1560, 60],
};
const at = (x, y) => {
  let a = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const i = ((Math.min(H - 1, Math.max(0, y + dy)) * W) + Math.min(W - 1, Math.max(0, x + dx))) * C;
    a += (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
  }
  return a / 25;
};
// ink's default tone/levels: shade = 1 - smoothstep(tone.x, tone.y, L); level = steps at levels
const [t0, t1] = [0.0, 0.5];
const LV = [0.55, 0.82, 0.96];
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const sx = Math.round(W / 1600), sy = Math.round(H / 900);
for (const [k, [x, y]] of Object.entries(PTS)) {
  const L = at(Math.round(x * W / 1600), Math.round(y * H / 900));
  const shade = 1 - ss(t0, t1, L);
  const lvl = (shade >= LV[0] ? 1 : 0) + (shade >= LV[1] ? 1 : 0) + (shade >= LV[2] ? 1 : 0);
  console.log(k.padEnd(24), 'L=' + L.toFixed(3), ' shade=' + shade.toFixed(2), ' level=' + lvl);
}
