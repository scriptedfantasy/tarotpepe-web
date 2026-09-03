// PIECE: pepe — Tarot Pepe himself: the supplied head, a body in a mustard suit and orange shirt
// (the only coloured figure in the drawing, as in the reference), hands, a chair. Seated upstage
// of the table, facing the visitor.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';

export const meta = {
  name: 'pepe',
  judge: { shot: 'pepe', states: ['default'] },
  files: ['src/pieces/pepe.js'],
};

export async function build(ctx) {
  const { pos, headY } = ctx.layout.pepe;
  const g = new THREE.Group();
  g.name = 'pepe';
  g.position.set(...pos);

  // body: a simple seated torso in the yellow suit, orange shirt
  const suit = inkMaterial({ color: '#d9b64a', colorful: true, hatch: 0.5 });
  const shirt = inkMaterial({ color: '#e0642a', colorful: true, hatch: 0.4 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.26), suit);
  torso.position.y = headY - 0.42;
  torso.castShadow = true;
  g.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.02), shirt);
  chest.position.set(0, headY - 0.36, 0.135);
  g.add(chest);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), suit);
    arm.position.set(s * 0.29, headY - 0.45, 0.02);
    arm.rotation.x = -0.9;
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), inkMaterial({ color: '#4f8f3a', colorful: true, hatch: 0.4 }));
    hand.position.set(s * 0.3, headY - 0.5, 0.36);
    g.add(hand);
  }

  // head from the supplied model
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = headY;
  g.add(head);
  try {
    const gltf = await ctx.assets.gltf('/pepe/head-lowpoly.glb');
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 0.34 / size.y;
    model.scale.setScalar(scale);
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        const m = o.material;
        if (m && m.isMeshStandardMaterial) {
          m.roughness = 0.95;
          m.metalness = 0;
          m.userData.ink = { hatch: 0.45, lineWeight: 1, colorful: true };
        }
      }
    });
    head.add(model);
  } catch (e) {
    console.error('[pepe] head failed to load, using a placeholder', e);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 20), inkMaterial({ color: '#4f8f3a', colorful: true })));
  }

  ctx.scene.add(g);
  return { group: g, head, torso, setState() {} };
}
