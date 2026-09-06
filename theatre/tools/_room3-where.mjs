#!/usr/bin/env node
// scratch (room round 3): WHERE two frames differ, by named region, against the boil's own noise
// floor. The whole-frame number is useless here — the drawing is re-struck every frame, so two
// shots of one build already differ in 9% of their pixels — so this takes a third frame of the
// same build as a control and reports each region twice: change, and noise.
//   node tools/_room3-where.mjs <before.png> <after.png> <control-of-after.png>
import sharp from 'sharp';

const [A, B, C] = process.argv.slice(2);
const load = (p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const [a, b, c] = await Promise.all([load(A), load(B), load(C)]);
const W = a.info.width, H = a.info.height;
const REGIONS = [
  ['floor + rug', 0, 640, W, H - 640],
  ['side walls, above 2.2 m', 0, 0, W, 260],
  ['back wall behind his head', 660, 240, 290, 190],
  ['the door', 990, 90, 220, 560],
  ['the window + shutters', 280, 90, 340, 560],
  ['the table + Pepe', 600, 400, 420, 300],
  ['stage-right wall, low', 1400, 260, 200, 380],
];
const diff = (p, q, x0, y0, w, h) => {
  let n = 0, sum = 0, tot = 0;
  for (let y = y0; y < Math.min(y0 + h, H); y++)
    for (let x = x0; x < Math.min(x0 + w, W); x++) {
      const i = (y * W + x) * 4;
      const d = Math.abs(p.data[i] - q.data[i]) + Math.abs(p.data[i + 1] - q.data[i + 1]) + Math.abs(p.data[i + 2] - q.data[i + 2]);
      if (d) n++;
      sum += d / 3;
      tot++;
    }
  return [(n / tot) * 100, sum / tot];
};
for (const [name, ...r] of REGIONS) {
  const [cp, cm] = diff(a, b, ...r);
  const [np, nm] = diff(c, b, ...r);
  console.log(`${name.padEnd(28)} changed ${cp.toFixed(1).padStart(5)}% / ${cm.toFixed(1).padStart(5)}   boil alone ${np.toFixed(1).padStart(5)}% / ${nm.toFixed(1).padStart(5)}`);
}
