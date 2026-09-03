// PIECE: props — set dressing. Shelves of bottles and books, a lamp, a radio, a potted plant,
// framed pictures, a hand-lettered sign, a rug, curtains. Dense, particular, drawn.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';

export const meta = {
  name: 'props',
  judge: { shot: 'wide', states: ['default'] },
  files: ['src/pieces/props.js'],
};

export async function build(ctx) {
  const { depth: D } = ctx.layout.room;
  const g = new THREE.Group();
  g.name = 'props';
  const wood = inkMaterial({ hatch: 0.6 });
  // a shelf with bottles, stage right of the door
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.25), wood);
  shelf.position.set(2.1, 1.5, -D / 2 + 0.15);
  g.add(shelf);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 12), inkMaterial({ hatch: 0.5 }));
    b.position.set(1.75 + i * 0.17, 1.66, -D / 2 + 0.15);
    b.castShadow = true;
    g.add(b);
  }
  // a floor lamp, stage left
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.5, 8), wood);
  pole.position.set(-2.0, 0.75, -1.6);
  g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 16, 1, true), inkMaterial({ hatch: 0.3, side: THREE.DoubleSide }));
  shade.position.set(-2.0, 1.6, -1.6);
  g.add(shade);
  // rug under the table
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), inkMaterial({ hatch: 0.7 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.002;
  rug.receiveShadow = true;
  g.add(rug);
  ctx.scene.add(g);
  return { group: g, setState() {} };
}
