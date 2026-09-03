// PIECE: table — the reading table: a round café table with a cloth, and the small things that
// live on it (a glass, an ashtray, a candle). The spread lives on its near half.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';

export const meta = {
  name: 'table',
  judge: { shot: 'table', states: ['default'] },
  files: ['src/pieces/table.js'],
};

export async function build(ctx) {
  const { top, radius } = ctx.layout.table;
  const g = new THREE.Group();
  g.name = 'table';
  const cloth = inkMaterial({ hatch: 0.35 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.03, 48), cloth);
  disc.position.y = top - 0.015;
  disc.castShadow = true;
  disc.receiveShadow = true;
  g.add(disc);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, 0.22, 48, 1, true), inkMaterial({ hatch: 0.5, side: THREE.DoubleSide }));
  skirt.position.y = top - 0.14;
  g.add(skirt);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, top - 0.05, 12), inkMaterial({ hatch: 0.6 }));
  leg.position.y = (top - 0.05) / 2;
  g.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.03, 24), inkMaterial({ hatch: 0.6 }));
  foot.position.y = 0.015;
  g.add(foot);
  g.position.set(...ctx.layout.table.pos);
  ctx.scene.add(g);
  return { group: g, top: disc, setState() {} };
}
