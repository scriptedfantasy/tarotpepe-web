// What `home` and `threshold` actually solve to, per window shape. node tools/_ent-shots.mjs
import { LAYOUT } from '../src/core/layout.js';
import { buildShots } from '../src/pieces/camera-shots.js';
for (const [w, h] of [[1600, 900], [390, 760], [1200, 1100]]) {
  const s = buildShots(LAYOUT, w / h);
  const f = (n) => {
    const x = s[n];
    return `${n}: pos [${x.pos.map((v) => v.toFixed(3))}] look [${x.look.map((v) => v.toFixed(3))}] fov ${x.fov.toFixed(2)} shift [${(x.shift ?? [0, 0]).map((v) => v.toFixed(4))}]`;
  };
  console.log(`--- ${w}x${h} (aspect ${(w / h).toFixed(3)})`);
  console.log('  ' + f('home'));
  console.log('  ' + f('threshold'));
  console.log('  ' + f('wide'));
}
