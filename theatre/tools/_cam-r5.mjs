// throwaway (camera round 5): where every frame's edges fall, at every aspect, straight off the
// shot table the piece uses — no dev server, so it answers in a second and it cannot drift from the
// page. Flags anything a frame edge cuts in half.
//   node tools/_cam-r5.mjs [shot …]
import { buildShots } from '../src/pieces/camera-shots.js';
import { place } from '../src/pieces/camera-frame.js';
import { LAYOUT as L } from '../src/core/layout.js';

const SIZES = [[1600, 900], [1200, 1100], [390, 760]];

// Things a frame edge must not cut, as boxes (name → [x0,x1,y0,y1,z0,z1]) and points.
const BOXES = {
  pendant: [-0.235, 0.235, 2.45, 3.1, -0.235, 0.235],
  'door opening': [1.05, 1.95, 0, 2.45, -2.51, -2.49],
  'window opening': [-1.95, -1.05, 1.04, 2.45, -2.51, -2.49],
  'TAROT board': [-0.5, 0.5, 2.41, 2.59, -2.46, -2.45],
  'VOYANTE board': [1.16, 1.84, 2.21, 2.41, -2.51, -2.5],
  clock: [-0.185, 0.185, 1.875, 2.245, -2.48, -2.47],
  'picture L': [-0.69, -0.23, 1.81, 2.27, -2.49, -2.48],
  bookcases: [0.68, 1.02, 0, 1.22, -2.46, -2.18],
  chest: [-0.52, 0.52, 0, 0.82, -2.46, -2.08],
  pepe: [-0.45, 0.45, 0.76, 1.4, -1.0, -0.7],
  table: [-0.62, 0.62, 0, 0.78, -0.62, 0.62],
  'slot row': [-0.425, 0.425, 0.76, 0.77, 0.026, 0.254],
  fan: [-0.45, 0.45, 0.76, 0.77, -0.05, 0.64],
  deck: [0.265, 0.495, 0.76, 0.8, -0.367, -0.133],
  rug: [-1.6, 1.6, 0, 0.01, -1.5, 1.1],
  'hat stand': [1.95, 2.25, 0, 1.85, -0.9, -0.6],
  'floor lamp': [-2.25, -1.95, 0, 1.62, -0.35, -0.05],
};
const corners = ([x0, x1, y0, y1, z0, z1]) => {
  const out = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push([x, y, z]);
  return out;
};
const MARKS = {
  'lamp bulbs': [0, 2.45, 0],
  'lamp rose': [0, 3.1, 0],
  'cornice@wall': [0, 2.98, -2.5],
  'ceiling@wall': [0, 3.1, -2.5],
  'TAROT top': [0, 2.59, -2.455],
  'crown': [0, 1.37, -0.82],
  'his hands': [0, 0.72, -0.4],
  'table near rim': [0, 0.76, 0.62],
  'table foot': [0, 0, 0.62],
  'rug near edge': [0, 0, 1.1],
  'wall base': [0, 0, -2.5],
  mic: [-0.435, 0.838, 0.14],
  'row far': [0, 0.7625, 0.026],
  'row near': [0, 0.7625, 0.254],
  'card upright': [0, 0.985, 0.08],
  'fan near': [0, 0.7625, 0.64],
  'fan far': [0, 0.7625, -0.05],
};

const only = process.argv.slice(2);
for (const [W, H] of SIZES) {
  const aspect = W / H;
  const shots = buildShots(L, aspect);
  console.log(`\n######## ${W}×${H}  (aspect ${aspect.toFixed(3)})`);
  for (const [name, shot] of Object.entries(shots)) {
    if (only.length && !only.includes(name)) continue;
    if (!shot.fov || !Array.isArray(shot.pos)) continue;
    const p = (q) => place(shot, aspect, q);
    console.log(
      `\n== ${name}  pos ${shot.pos.map((n) => n.toFixed(2)).join(',')}  fov ${shot.fov.toFixed(1)}  shift ${(shot.shift?.[1] ?? 0).toFixed(3)}${shot.anchor != null ? `  anchor#${shot.anchor}` : ''}`,
    );
    // what the edges cut
    const cut = [];
    for (const [n, b] of Object.entries(BOXES)) {
      const qs = corners(b).map(p);
      if (qs.some((q) => q.depth <= 0)) continue;
      const inside = qs.filter((q) => Math.abs(q.u) <= 1 && Math.abs(q.v) <= 1).length;
      if (inside === 0 || inside === qs.length) continue;
      const top = qs.some((q) => q.v > 1) && qs.some((q) => q.v <= 1);
      const bot = qs.some((q) => q.v < -1) && qs.some((q) => q.v >= -1);
      const side = qs.some((q) => Math.abs(q.u) > 1) && qs.some((q) => Math.abs(q.u) <= 1);
      cut.push(`${n}[${top ? 'TOP ' : ''}${bot ? 'bottom ' : ''}${side ? 'side' : ''}]`);
    }
    console.log(`   cut: ${cut.length ? cut.join('  ') : '—'}`);
    const line = [];
    for (const [n, q] of Object.entries(MARKS)) {
      const r = p(q);
      const where = r.depth <= 0 ? 'behind' : r.y < 0 ? 'above' : r.y > 1 ? 'below' : `${r.y.toFixed(3)}`;
      line.push(`${n} ${where}${Math.abs(r.u) > 1 && r.depth > 0 ? '(off)' : ''}`);
    }
    console.log('   ' + line.join(' · '));
  }
}
