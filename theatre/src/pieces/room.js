// PIECE: room — the parlour set itself: floor, walls, ceiling, wallpaper, window with shutters,
// door, skirting and picture rail. Frontal, symmetrical, drawn with a pen.
import * as THREE from 'three';
import { inkMaterial, drawTexture, paper, hatch, inkLine } from '../core/strokes.js';

export const meta = {
  name: 'room',
  judge: { shot: 'wide', states: ['default'] },
  files: ['src/pieces/room.js'],
};

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const g = new THREE.Group();
  g.name = 'room';

  const wallTex = drawTexture(
    1024,
    1024,
    (c, w, h, rng) => {
      paper(c, w, h);
      hatch(c, 0, 0, w, h, { angle: Math.PI / 2, spacing: 14, width: 1.1, wobble: 0.9, broken: 0.5, rng, alpha: 0.35 });
    },
    { repeat: [3, 2], seed: 11 },
  );
  const floorTex = drawTexture(
    1024,
    1024,
    (c, w, h, rng) => {
      paper(c, w, h, '#f1ece2');
      for (let y = 0; y < h; y += 96) inkLine(c, 0, y, w, y, { width: 2, wobble: 1.2, rng, alpha: 0.7 });
      hatch(c, 0, 0, w, h, { angle: 0, spacing: 9, width: 0.8, wobble: 0.5, broken: 0.6, rng, alpha: 0.18 });
    },
    { repeat: [4, 4], seed: 5 },
  );

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), inkMaterial({ map: floorTex, hatch: 0.4 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  const wallMat = inkMaterial({ map: wallTex, hatch: 0.3 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, H / 2, 0);
  g.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, H / 2, 0);
  g.add(right);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), inkMaterial({ hatch: 0.1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  g.add(ceiling);

  // skirting + picture rail
  const trim = inkMaterial({ hatch: 0.6, lineWeight: 1.2 });
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, 0.03), trim);
  skirt.position.set(0, 0.07, -D / 2 + 0.015);
  g.add(skirt);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, 0.03), trim);
  rail.position.set(0, H - 0.55, -D / 2 + 0.015);
  g.add(rail);

  // window on the back wall, stage left; door stage right
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.08), trim);
  frame.position.set(-1.5, 1.75, -D / 2 + 0.03);
  g.add(frame);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.35), inkMaterial({ color: '#fbfaf5', hatch: 0.05 }));
  pane.position.set(-1.5, 1.75, -D / 2 + 0.075);
  g.add(pane);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 0.06), trim);
  door.position.set(1.5, 1.05, -D / 2 + 0.03);
  g.add(door);

  ctx.scene.add(g);
  return { group: g, setState() {} };
}
