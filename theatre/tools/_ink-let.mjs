#!/usr/bin/env node
// The lettering probe. For a named rectangle, say what the ink pass was given and what it made of
// it: how dark the surface's OWN drawing is there (the albedo), how minified it is (texels of that
// drawing per screen pixel), and what the composite put on the paper. A legible label has ink AND
// paper in the composite; a blank one is all paper; a blot is all ink; a smudge is neither — mid
// greys, which the world's rules forbid outright.
//   node tools/_ink-let.mjs <albedo.png> <minif.png> <composite.png> x y w h label [x y w h label...]
import sharp from 'sharp';

const [albF, minF, cmpF, ...rest] = process.argv.slice(2);
const load = async (f) => {
  const { data, info } = await sharp(f).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const alb = await load(albF), min = await load(minF), cmp = await load(cmpF);

const pct = (n, d) => ((n / d) * 100).toFixed(0).padStart(3);
console.log('rect                         albedo(ink/paper/mid)   texels/px     composite(ink/paper/mid)');
for (let i = 0; i < rest.length; i += 5) {
  const [x, y, w, h] = rest.slice(i, i + 4).map(Number);
  const label = rest[i + 4] ?? `${x},${y}`;
  let n = 0, aInk = 0, aPap = 0, aMid = 0, cInk = 0, cPap = 0, cMid = 0;
  const tex = [];
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const j = yy * alb.w + xx;
    n++;
    const a = alb.data[j], c = cmp.data[j];
    if (a < 80) aInk++; else if (a > 200) aPap++; else aMid++;
    if (c < 80) cInk++; else if (c > 200) cPap++; else cMid++;
    tex.push(2 ** ((min.data[j] / 255 - 0.25) * 8));
  }
  tex.sort((p, q) => p - q);
  console.log(
    `${label.padEnd(26)} ${pct(aInk, n)}/${pct(aPap, n)}/${pct(aMid, n)}%   ` +
    `p50 ${tex[tex.length >> 1].toFixed(1).padStart(5)} p90 ${tex[Math.floor(tex.length * 0.9)].toFixed(1).padStart(5)}   ` +
    `${pct(cInk, n)}/${pct(cPap, n)}/${pct(cMid, n)}%`,
  );
}
